import { z } from "zod";
import { bankAccounts, type DbOrTx } from "@money-matters/db";
import {
  CreateBankAccountCommand,
  UpdateBankAccountCommand,
  type BankAccountLifecycleHooks,
  type BankBalanceSyncSplit,
} from "@money-matters/types";
import { eq, and, sql, or } from "drizzle-orm";
import { ensurePremiumAccess } from "@money-matters/core";

export function getBankAccountsWithMappingsHandler(
  db: DbOrTx,
  hooks?: BankAccountLifecycleHooks<DbOrTx>
) {
  return async (tenantId: string, appId: string, userId?: string) => {
    const accountFilters = [
      eq(bankAccounts.tenantId, tenantId),
      eq(bankAccounts.appId, appId),
      sql`${bankAccounts.archivedAt} IS NULL`,
    ];
    if (userId) {
      accountFilters.push(or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, userId))!);
    }

    const accounts = await db.select().from(bankAccounts).where(and(...accountFilters));
    const linkedItems = (await hooks?.onBankAccountsListed?.({ db, tenantId, appId, userId })) ?? [];

    return accounts.map((acc) => {
      const linked = linkedItems.filter((item) => item.bankAccountId === acc.id);
      return {
        ...acc,
        envelopes: linked,
        poolTypes: Array.from(new Set(linked.map((item) => item.envelopeType))),
      };
    });
  };
}

export function createBankAccountHandler(
  db: DbOrTx,
  hooks?: BankAccountLifecycleHooks<DbOrTx>
) {
  return async (
    input: z.infer<typeof CreateBankAccountCommand>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    if (input.isPrivate) {
      await ensurePremiumAccess(db, tenantId, "Private personal bank accounts", appId);
    }

    const [bankAccount] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        name: input.name,
        bankProvider: input.bankProvider ?? "Other",
        accountType: input.accountType ?? "EVERYDAY",
        lastKnownBalance: input.lastKnownBalance,
        unbudgetedBuffer: input.unbudgetedBuffer,
        isPrivate: input.isPrivate ?? false,
        userId: input.isPrivate ? userId : null,
        appId,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();

    if (input.isPrivate) {
      await hooks?.onPrivateBankAccountCreated?.({
        db,
        tenantId,
        appId,
        userId,
        bankAccountId: bankAccount.id,
      });
    }

    return bankAccount;
  };
}

export function updateBankAccountHandler(db: DbOrTx) {
  return async (
    accountId: string,
    input: z.infer<typeof UpdateBankAccountCommand>,
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing || (existing.isPrivate && existing.userId !== userId)) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    const effectiveBalance = Number(input.lastKnownBalance ?? existing.lastKnownBalance ?? "0");
    const effectiveBuffer = Number(input.unbudgetedBuffer ?? existing.unbudgetedBuffer ?? "0");
    if (effectiveBuffer > effectiveBalance) {
      throw new Error("Safety cushion cannot exceed the current balance.");
    }
    if (input.isPrivate !== undefined && input.isPrivate !== existing.isPrivate) {
      throw new Error("Account privacy cannot be modified after creation.");
    }

    const [updated] = await db
      .update(bankAccounts)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.bankProvider !== undefined ? { bankProvider: input.bankProvider } : {}),
        ...(input.accountType !== undefined ? { accountType: input.accountType } : {}),
        ...(input.lastKnownBalance !== undefined ? { lastKnownBalance: input.lastKnownBalance } : {}),
        ...(input.unbudgetedBuffer !== undefined ? { unbudgetedBuffer: input.unbudgetedBuffer } : {}),
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .returning();

    if (!updated) throw new Error("Bank account not found or access unauthorized.");
    return updated;
  };
}

export function archiveBankAccountHandler(
  db: DbOrTx,
  hooks?: BankAccountLifecycleHooks<DbOrTx>
) {
  return async (accountId: string, tenantId: string, appId: string, userId: string) => {
    const [existing] = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .limit(1);

    if (!existing || (existing.isPrivate && existing.userId !== userId)) {
      throw new Error("Bank account not found or access unauthorized.");
    }

    await hooks?.validateBeforeArchive?.({
      db,
      tenantId,
      appId,
      userId,
      accountId,
      isPrivate: existing.isPrivate,
    });

    const archiveTimestamp = new Date();
    const [archived] = await db
      .update(bankAccounts)
      .set({
        archivedAt: archiveTimestamp,
        archivedBy: userId,
        updatedBy: userId,
        updatedAt: archiveTimestamp,
      })
      .where(
        and(
          eq(bankAccounts.id, accountId),
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      )
      .returning();

    if (!archived) throw new Error("Bank account not found or access unauthorized.");

    await hooks?.onBankAccountArchived?.({
      db,
      tenantId,
      appId,
      userId,
      accountId,
      isPrivate: existing.isPrivate,
      archiveTimestamp,
    });

    return { success: true };
  };
}

export function listBankAccountsWithExpectedHandler(
  db: DbOrTx,
  hooks?: BankAccountLifecycleHooks<DbOrTx>
) {
  return async (tenantId: string, appId: string, userId: string) => {
    const accounts = await db
      .select()
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          sql`${bankAccounts.archivedAt} IS NULL`,
          or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, userId))!
        )
      );

    const expectedMap =
      (await hooks?.onComputeExpectedBalances?.({
        db,
        tenantId,
        appId,
        userId,
        accounts: accounts.map((a) => ({ id: a.id, unbudgetedBuffer: a.unbudgetedBuffer })),
      })) ?? {};

    return accounts.map((acc) => {
      const summary = expectedMap[acc.id];
      return {
        ...acc,
        expectedBalance: summary?.expectedBalance ?? parseFloat(acc.unbudgetedBuffer || "0").toFixed(2),
        linkedPoolCount: summary?.linkedPoolCount ?? 0,
        linkedEnvelopeCount: summary?.linkedEnvelopeCount ?? 0,
      };
    });
  };
}

export function syncBankBalanceHandler(
  db: DbOrTx,
  hooks?: BankAccountLifecycleHooks<DbOrTx>
) {
  return async (
    input: {
      accountId: string;
      actualBalance: string;
      clientIdempotencyToken: string;
      note?: string;
      splits: BankBalanceSyncSplit[];
    },
    tenantId: string,
    appId: string,
    userId: string
  ) => {
    return await db.transaction(async (tx) => {
      const [acc] = await tx
        .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.id, input.accountId),
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!acc || (acc.isPrivate && acc.userId !== userId)) {
        throw new Error("Bank account not found or access unauthorized.");
      }

      await tx
        .update(bankAccounts)
        .set({
          lastKnownBalance: input.actualBalance,
          lastBalanceMatchedAt: new Date(),
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(eq(bankAccounts.id, input.accountId));

      await hooks?.onBankBalanceSynced?.({
        db: tx,
        tenantId,
        appId,
        userId,
        accountId: input.accountId,
        clientIdempotencyToken: input.clientIdempotencyToken,
        note: input.note,
        splits: input.splits,
      });

      return { success: true };
    });
  };
}
