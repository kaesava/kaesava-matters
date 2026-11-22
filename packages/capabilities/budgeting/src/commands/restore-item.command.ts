import { envelopes, expenseEvents, incomeSources, incomeEvents, bankAccounts, apps, DbOrTx } from "@kaesava/db";
import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { resolveEffectiveAppFlags } from "@kaesava/config";

const CASCADE_WINDOW_MS = 2000;

export async function restoreItemCommand(
  itemId: string,
  itemType: "ENVELOPE" | "INCOME_SOURCE" | "BANK_ACCOUNT",
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return dbClient.transaction(async (tx) => {
    const now = new Date();

    if (itemType === "BANK_ACCOUNT") {
      const [acc] = await tx
        .select()
        .from(bankAccounts)
        .where(and(eq(bankAccounts.id, itemId), eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
      if (!acc) throw new Error("Bank account not found.");
      if (acc.isPrivate && acc.userId !== userId) {
        throw new Error("Access unauthorized or private account.");
      }
      if (acc.isPrivate) {
        const [appRecord] = await tx
          .select({ featureFlags: apps.featureFlags })
          .from(apps)
          .where(eq(apps.id, appId))
          .limit(1);
        const flags = resolveEffectiveAppFlags(appId, appRecord?.featureFlags);
        if (!flags.privateMode) {
          throw new Error("Private Mode is currently disabled for this application. Private items cannot be restored.");
        }
      }

      const bankArchivedAt = acc.archivedAt;
      if (!bankArchivedAt) return acc;

      const [restoredAcc] = await tx
        .update(bankAccounts)
        .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
        .where(
          and(
            eq(bankAccounts.id, itemId),
            eq(bankAccounts.tenantId, tenantId),
            eq(bankAccounts.appId, appId),
            sql`${bankAccounts.archivedAt} IS NOT NULL`
          )
        )
        .returning();

      if (!restoredAcc) return acc;

      // Cascade restore linked envelopes, income sources, and pending events archived in the same batch (+-2s)
      const archivedTimeMs = new Date(bankArchivedAt).getTime();
      const windowStart = new Date(archivedTimeMs - CASCADE_WINDOW_MS);
      const windowEnd = new Date(archivedTimeMs + CASCADE_WINDOW_MS);

      const restoredEnvelopes = await tx
        .update(envelopes)
        .set({ archivedAt: null, archivedBy: null, isSurplusTarget: false, updatedBy: userId, updatedAt: now })
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.bankAccountId, itemId),
            sql`${envelopes.archivedAt} IS NOT NULL`,
            gte(envelopes.archivedAt, windowStart),
            lte(envelopes.archivedAt, windowEnd)
          )
        )
        .returning();

      const restoredEnvelopeIds = restoredEnvelopes.map((e) => e.id);
      if (restoredEnvelopeIds.length > 0) {
        await tx
          .update(expenseEvents)
          .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
          .where(
            and(
              inArray(expenseEvents.envelopeId, restoredEnvelopeIds),
              eq(expenseEvents.status, "PENDING"),
              eq(expenseEvents.tenantId, tenantId),
              eq(expenseEvents.appId, appId),
              sql`${expenseEvents.archivedAt} IS NOT NULL`,
              gte(expenseEvents.archivedAt, windowStart),
              lte(expenseEvents.archivedAt, windowEnd)
            )
          );
      }

      // Ensure private bank account restore guarantees exactly one active Private Everyday envelope
      if (restoredAcc.isPrivate) {
        const activePrivateEveryday = await tx
          .select({ id: envelopes.id })
          .from(envelopes)
          .where(
            and(
              eq(envelopes.tenantId, tenantId),
              eq(envelopes.appId, appId),
              eq(envelopes.isPrivate, true),
              eq(envelopes.userId, userId),
              eq(envelopes.envelopeType, "EVERYDAY"),
              sql`${envelopes.archivedAt} IS NULL`
            )
          )
          .limit(1);

        if (activePrivateEveryday.length === 0) {
          const [archivedPrivateEveryday] = await tx
            .select({ id: envelopes.id })
            .from(envelopes)
            .where(
              and(
                eq(envelopes.tenantId, tenantId),
                eq(envelopes.appId, appId),
                eq(envelopes.isPrivate, true),
                eq(envelopes.userId, userId),
                eq(envelopes.envelopeType, "EVERYDAY"),
                sql`${envelopes.archivedAt} IS NOT NULL`
              )
            )
            .limit(1);

          if (archivedPrivateEveryday) {
            await tx
              .update(envelopes)
              .set({ bankAccountId: restoredAcc.id, archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
              .where(eq(envelopes.id, archivedPrivateEveryday.id));
          } else {
            await tx.insert(envelopes).values({
              tenantId,
              appId,
              bankAccountId: restoredAcc.id,
              name: "Personal Spending",
              envelopeType: "EVERYDAY",
              monthlyAmount: "0.00",
              isPrivate: true,
              userId,
              orderIndex: 0,
              createdBy: userId,
              updatedBy: userId,
            });
          }
        }
      }

      const restoredIncomes = await tx
        .update(incomeSources)
        .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
        .where(
          and(
            eq(incomeSources.tenantId, tenantId),
            eq(incomeSources.appId, appId),
            eq(incomeSources.receivingAccountId, itemId),
            sql`${incomeSources.archivedAt} IS NOT NULL`,
            gte(incomeSources.archivedAt, windowStart),
            lte(incomeSources.archivedAt, windowEnd)
          )
        )
        .returning();

      const restoredIncomeIds = restoredIncomes.map((i) => i.id);
      if (restoredIncomeIds.length > 0) {
        await tx
          .update(incomeEvents)
          .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
          .where(
            and(
              inArray(incomeEvents.incomeSourceId, restoredIncomeIds),
              eq(incomeEvents.status, "PENDING"),
              eq(incomeEvents.tenantId, tenantId),
              eq(incomeEvents.appId, appId),
              sql`${incomeEvents.archivedAt} IS NOT NULL`,
              gte(incomeEvents.archivedAt, windowStart),
              lte(incomeEvents.archivedAt, windowEnd)
            )
          );
      }

      return restoredAcc;
    }

    if (itemType === "ENVELOPE") {
      const [env] = await tx
        .select({
          envelope: envelopes,
          bankAccountArchivedAt: bankAccounts.archivedAt,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(and(eq(envelopes.id, itemId), eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));

      if (!env) throw new Error("Envelope not found.");
      const rawEnv = "envelope" in env && env.envelope ? env.envelope : (env as unknown as typeof envelopes.$inferSelect);
      const isEnvPrivate = Boolean(rawEnv.isPrivate);
      const envUserId = rawEnv.userId;
      if (
        (isEnvPrivate && envUserId !== userId) ||
        (env.bankAccountIsPrivate && env.bankAccountUserId !== userId)
      ) {
        throw new Error("Access unauthorized or private envelope.");
      }

      if (isEnvPrivate || env.bankAccountIsPrivate) {
        const [appRecord] = await tx
          .select({ featureFlags: apps.featureFlags })
          .from(apps)
          .where(eq(apps.id, appId))
          .limit(1);
        const flags = resolveEffectiveAppFlags(appId, appRecord?.featureFlags);
        if (!flags.privateMode) {
          throw new Error("Private Mode is currently disabled for this application. Private items cannot be restored.");
        }
      }

      if (!rawEnv.archivedAt) return rawEnv;

      if (env.bankAccountArchivedAt) {
        throw new Error("Cannot restore envelope because its linked bank account is archived. Please restore the bank account first.");
      }

      if (rawEnv.envelopeType === "EVERYDAY") {
        const existingEveryday = await tx
          .select({ id: envelopes.id })
          .from(envelopes)
          .where(
            and(
              eq(envelopes.tenantId, tenantId),
              eq(envelopes.appId, appId),
              eq(envelopes.envelopeType, "EVERYDAY"),
              eq(envelopes.isPrivate, isEnvPrivate),
              ...(isEnvPrivate ? [eq(envelopes.userId, userId)] : []),
              sql`${envelopes.archivedAt} IS NULL`
            )
          )
          .limit(1);
        if (existingEveryday.length > 0) {
          throw new Error("An active Everyday envelope already exists for this privacy tier.");
        }
      }

      const archivedTimeMs = new Date(rawEnv.archivedAt).getTime();
      const windowStart = new Date(archivedTimeMs - CASCADE_WINDOW_MS);
      const windowEnd = new Date(archivedTimeMs + CASCADE_WINDOW_MS);

      const [restored] = await tx
        .update(envelopes)
        .set({ archivedAt: null, archivedBy: null, isSurplusTarget: false, updatedBy: userId, updatedAt: now })
        .where(
          and(
            eq(envelopes.id, itemId),
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            sql`${envelopes.archivedAt} IS NOT NULL`
          )
        )
        .returning();

      if (restored) {
        await tx
          .update(expenseEvents)
          .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
          .where(
            and(
              eq(expenseEvents.envelopeId, restored.id),
              eq(expenseEvents.status, "PENDING"),
              eq(expenseEvents.tenantId, tenantId),
              eq(expenseEvents.appId, appId),
              sql`${expenseEvents.archivedAt} IS NOT NULL`,
              gte(expenseEvents.archivedAt, windowStart),
              lte(expenseEvents.archivedAt, windowEnd)
            )
          );
      }

      return restored;
    }

    if (itemType === "INCOME_SOURCE") {
      const [inc] = await tx
        .select({
          incomeSource: incomeSources,
          bankAccountArchivedAt: bankAccounts.archivedAt,
          bankAccountIsPrivate: bankAccounts.isPrivate,
          bankAccountUserId: bankAccounts.userId,
        })
        .from(incomeSources)
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(and(eq(incomeSources.id, itemId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));

      if (!inc) throw new Error("Income source not found.");
      if (inc.bankAccountIsPrivate && inc.bankAccountUserId !== userId) {
        throw new Error("Access unauthorized or private income source.");
      }

      if (!inc.incomeSource.archivedAt) return inc.incomeSource;

      if (inc.bankAccountArchivedAt) {
        throw new Error("Cannot restore income schedule because its receiving bank account is archived. Please restore the bank account first.");
      }

      const activePrivate = await tx
        .select({ id: envelopes.id })
        .from(envelopes)
        .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            sql`${envelopes.archivedAt} IS NULL`,
            sql`(${envelopes.isPrivate} = true OR ${bankAccounts.isPrivate} = true)`
          )
        );

      const hasPrivate = activePrivate.length > 0;
      let isPrivateAccount = false;
      if (inc.incomeSource.receivingAccountId) {
        const [acc] = await tx
          .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
          .from(bankAccounts)
          .where(eq(bankAccounts.id, inc.incomeSource.receivingAccountId))
          .limit(1);
        isPrivateAccount = Boolean(acc?.isPrivate && acc.userId === userId);
      }
      const archivedTimeMs = new Date(inc.incomeSource.archivedAt).getTime();
      const windowStart = new Date(archivedTimeMs - CASCADE_WINDOW_MS);
      const windowEnd = new Date(archivedTimeMs + CASCADE_WINDOW_MS);

      const [restored] = await tx
        .update(incomeSources)
        .set({
          archivedAt: null,
          archivedBy: null,
          ...(!(hasPrivate && isPrivateAccount) ? { contributionMode: "FULL", contributionValue: null } : {}),
          updatedBy: userId,
          updatedAt: now,
        })
        .where(
          and(
            eq(incomeSources.id, itemId),
            eq(incomeSources.tenantId, tenantId),
            eq(incomeSources.appId, appId),
            sql`${incomeSources.archivedAt} IS NOT NULL`
          )
        )
        .returning();

      if (restored) {
        await tx
          .update(incomeEvents)
          .set({ archivedAt: null, archivedBy: null, updatedBy: userId, updatedAt: now })
          .where(
            and(
              eq(incomeEvents.incomeSourceId, restored.id),
              eq(incomeEvents.status, "PENDING"),
              eq(incomeEvents.tenantId, tenantId),
              eq(incomeEvents.appId, appId),
              sql`${incomeEvents.archivedAt} IS NOT NULL`,
              gte(incomeEvents.archivedAt, windowStart),
              lte(incomeEvents.archivedAt, windowEnd)
            )
          );
      }

      return restored;
    }

    throw new Error("Unsupported item type for restoration.");
  });
}
