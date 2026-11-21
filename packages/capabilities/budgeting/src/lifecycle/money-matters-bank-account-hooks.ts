import {
  bankAccounts,
  envelopes,
  expenseEvents,
  incomeSources,
  incomeEvents,
  transactionLedger,
  type DbOrTx,
} from "@money-matters/db";
import type { BankAccountLifecycleHooks } from "@money-matters/types";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { listEnvelopesQuery } from "../queries/list-envelopes.query.js";

export const moneyMattersBankAccountHooks: BankAccountLifecycleHooks<DbOrTx> = {
  async onBankAccountsListed({ db, tenantId, appId, userId }) {
    const tenantPools = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`));

    return tenantPools.filter((p) => !(userId && p.isPrivate && p.userId !== userId));
  },

  async onPrivateBankAccountCreated({ db, tenantId, appId, userId, bankAccountId }) {
    const existingPrivateEveryday = await db
      .select({ id: envelopes.id })
      .from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.isPrivate, true), eq(envelopes.userId, userId), eq(envelopes.envelopeType, "EVERYDAY"), sql`${envelopes.archivedAt} IS NULL`))
      .limit(1);
    if (existingPrivateEveryday.length > 0) return;

    const [archivedPrivateEveryday] = await db
      .select({ id: envelopes.id })
      .from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.isPrivate, true), eq(envelopes.userId, userId), eq(envelopes.envelopeType, "EVERYDAY"), sql`${envelopes.archivedAt} IS NOT NULL`))
      .limit(1);

    if (archivedPrivateEveryday) {
      await db.update(envelopes).set({ bankAccountId, archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: new Date() }).where(eq(envelopes.id, archivedPrivateEveryday.id));
    } else {
      await db.insert(envelopes).values({
        tenantId, appId, bankAccountId, name: "Personal Spending", envelopeType: "EVERYDAY",
        monthlyAmount: "0.00", isPrivate: true, userId, orderIndex: 0, createdBy: userId, updatedBy: userId,
      });
    }
  },

  async validateBeforeArchive({ db, tenantId, appId, userId, accountId, isPrivate }) {
    const activePools = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.bankAccountId, accountId), sql`${envelopes.archivedAt} IS NULL`));

    if (activePools.some((p) => p.envelopeType === "EVERYDAY")) {
      if (!isPrivate) {
        throw new Error("Cannot archive bank account linked to the Everyday envelope. Please re-assign the Everyday envelope to another bank account first.");
      }
      const otherPrivateAccounts = await db
        .select({ id: bankAccounts.id })
        .from(bankAccounts)
        .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId), sql`${bankAccounts.id} <> ${accountId}`, sql`${bankAccounts.archivedAt} IS NULL`))
        .limit(1);
      if (otherPrivateAccounts.length > 0) {
        throw new Error("Cannot archive private bank account linked to your Personal Spending envelope while other private bank accounts exist. Please re-assign Personal Spending to another private bank account first.");
      }
    }

    if (activePools.some((p) => p.isSurplusTarget)) {
      throw new Error("Cannot archive bank account linked to the active Surplus Sweep Target. Please designate another Surplus Sweep Target or re-assign it to another bank account first.");
    }
  },

  async onBankAccountArchived({ db, tenantId, appId, userId, accountId, isPrivate, archiveTimestamp }) {
    const activePools = await db.select({ id: envelopes.id }).from(envelopes)
      .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.bankAccountId, accountId), sql`${envelopes.archivedAt} IS NULL`));
    const poolIds = activePools.map((p) => p.id);
    if (poolIds.length > 0) {
      await db.update(envelopes).set({ archivedAt: archiveTimestamp, archivedBy: userId, updatedBy: userId, updatedAt: archiveTimestamp })
        .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.bankAccountId, accountId), sql`${envelopes.archivedAt} IS NULL`));
      await db.update(expenseEvents).set({ archivedAt: archiveTimestamp, archivedBy: userId, updatedBy: userId, updatedAt: archiveTimestamp })
        .where(and(inArray(expenseEvents.envelopeId, poolIds), eq(expenseEvents.status, "PENDING"), eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId), sql`${expenseEvents.archivedAt} IS NULL`));
    }

    const linkedIncomes = await db.select({ id: incomeSources.id }).from(incomeSources)
      .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), eq(incomeSources.receivingAccountId, accountId), sql`${incomeSources.archivedAt} IS NULL`));
    const incomeIds = linkedIncomes.map((i) => i.id);
    if (incomeIds.length > 0) {
      await db.update(incomeSources).set({ archivedAt: archiveTimestamp, archivedBy: userId, updatedBy: userId, updatedAt: archiveTimestamp })
        .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), eq(incomeSources.receivingAccountId, accountId), sql`${incomeSources.archivedAt} IS NULL`));
      await db.update(incomeEvents).set({ archivedAt: archiveTimestamp, archivedBy: userId, updatedBy: userId, updatedAt: archiveTimestamp })
        .where(and(inArray(incomeEvents.incomeSourceId, incomeIds), eq(incomeEvents.status, "PENDING"), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.archivedAt} IS NULL`));
    }

    if (isPrivate) {
      const activePrivate = await db.select({ id: envelopes.id }).from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), sql`${envelopes.archivedAt} IS NULL`, or(and(eq(envelopes.isPrivate, true), eq(envelopes.userId, userId)), and(eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId)))));
      if (activePrivate.length === 0) {
        await db.update(incomeSources).set({ contributionMode: "FULL", contributionValue: null, updatedAt: new Date(), updatedBy: userId })
          .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), eq(incomeSources.receivingAccountId, accountId), sql`${incomeSources.archivedAt} IS NULL`));
        await db.update(incomeEvents).set({ contributionMode: "FULL", contributionValue: null, updatedAt: new Date(), updatedBy: userId })
          .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), eq(incomeEvents.createdBy, userId), sql`${incomeEvents.status} != 'CONFIRMED'`, sql`${incomeEvents.archivedAt} IS NULL`));
      }
    }
  },

  async onComputeExpectedBalances({ db, tenantId, appId, userId, accounts }) {
    const allEnvelopes = await listEnvelopesQuery(tenantId, appId, db, userId);
    const result: Record<string, { expectedBalance: string; linkedPoolCount: number; linkedEnvelopeCount: number }> = {};
    for (const acc of accounts) {
      const linked = allEnvelopes.filter((p) => p.bankAccountId === acc.id);
      const buffer = parseFloat(acc.unbudgetedBuffer || "0");
      const expectedBalance = linked.reduce((sum, p) => sum + (p.currentBalance || 0), 0) + buffer;
      result[acc.id] = {
        expectedBalance: expectedBalance.toFixed(2),
        linkedPoolCount: linked.length,
        linkedEnvelopeCount: linked.length,
      };
    }
    return result;
  },

  async onBankBalanceSynced({ db: tx, tenantId, appId, userId, accountId, clientIdempotencyToken, note, splits }) {
    const alignmentNote = note?.trim() || "Balance matched";
    const txValues = [];
    for (const split of splits) {
      const adj = parseFloat(split.adjustment);
      if (Math.abs(adj) < 0.01) continue;
      const targetEnvId = (split.envelopeId || split.poolId)!;
      txValues.push({
        tenantId,
        appId,
        envelopeId: targetEnvId,
        bankAccountId: accountId,
        flowType: (adj > 0 ? "CREDIT" : "DEBIT") as "CREDIT" | "DEBIT",
        transactionType: "ACCOUNT_ALIGNMENT" as const,
        amount: Math.abs(adj).toFixed(2),
        idempotencyKey: `reconcile-${accountId}-${targetEnvId}-${clientIdempotencyToken}`,
        note: alignmentNote,
        source: "MANUAL" as const,
        createdBy: userId,
        updatedBy: userId,
      });
    }
    if (txValues.length > 0) {
      await tx.insert(transactionLedger).values(txValues);
    }
  },
};
