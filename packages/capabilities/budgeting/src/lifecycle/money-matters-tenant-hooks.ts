import {
  envelopes,
  bankAccounts,
  incomeSources,
  incomeEvents,
  expenseEvents,
  transferEvents,
  transactionLedger,
  allocationPlans,
  allocationPlanLines,
  allocationStrategies,
  allocationStrategySteps,
  fileNotes,
  type DbOrTx,
} from "@money-matters/db";
import type { TenantLifecycleContext, TenantLifecycleHooks } from "@money-matters/types";
import { and, eq, inArray, isNull, ne } from "drizzle-orm";
import { exportMoneyMattersTenantCsvs } from "./money-matters-export-hook.js";

export const DEFAULT_BANK_ACCOUNT_NAME = "Primary Bank Account";
export const DEFAULT_EVERYDAY_ENVELOPE_NAME = "Everyday Spending";

export async function seedMinimalWorkspace(
  db: DbOrTx,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    existingBankAccountId?: string | null;
    existingEverydayEnvelopeId?: string | null;
    hasEverydayEnvelope?: boolean;
  }
): Promise<{ bankAccountId: string; everydayEnvelopeId: string | null }> {
  const { tenantId, appId, userId } = params;
  let bankAccountId = params.existingBankAccountId ?? null;
  if (!bankAccountId) {
    const [acc] = await db
      .insert(bankAccounts)
      .values({
        tenantId,
        appId,
        name: DEFAULT_BANK_ACCOUNT_NAME,
        bankProvider: "Other",
        accountType: "EVERYDAY",
        lastKnownBalance: "0.00",
        unbudgetedBuffer: "0.00",
        isPrivate: false,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    bankAccountId = acc.id;
  }
  let everydayEnvelopeId = params.existingEverydayEnvelopeId ?? null;
  if (!everydayEnvelopeId && !params.hasEverydayEnvelope) {
    const ins = await db
      .insert(envelopes)
      .values({
        tenantId,
        appId,
        bankAccountId,
        name: DEFAULT_EVERYDAY_ENVELOPE_NAME,
        envelopeType: "EVERYDAY",
        fundingMode: "TARGET_BALANCE",
        monthlyAmount: "0.00",
        budgetFrequency: "MONTHLY",
        isPriority: true,
        isSurplusTarget: true,
        isPrivate: false,
        orderIndex: 0,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    everydayEnvelopeId = Array.isArray(ins) && ins[0]?.id ? ins[0].id : null;
  }
  return { bankAccountId, everydayEnvelopeId };
}

async function archiveNonMinimalEntities(
  tx: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string,
  keepBankAccountId: string,
  keepEverydayEnvelopeId: string | null,
  now: Date
): Promise<void> {
  const envelopeCond = keepEverydayEnvelopeId
    ? and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), ne(envelopes.id, keepEverydayEnvelopeId), isNull(envelopes.archivedAt))
    : and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), ne(envelopes.envelopeType, "EVERYDAY"), isNull(envelopes.archivedAt));
  await tx.update(envelopes).set({ archivedAt: now, archivedBy: userId, isSurplusTarget: false, updatedAt: now, updatedBy: userId }).where(envelopeCond);
  await tx.update(bankAccounts).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), ne(bankAccounts.id, keepBankAccountId), isNull(bankAccounts.archivedAt)));
  await tx.update(incomeSources).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), isNull(incomeSources.archivedAt)));
  await tx.update(incomeEvents).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), isNull(incomeEvents.archivedAt)));
  await tx.update(expenseEvents).set({ archivedAt: now, archivedBy: userId, updatedAt: now, updatedBy: userId })
    .where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId), isNull(expenseEvents.archivedAt)));
}

async function ensureMinimalWorkspaceOnCancel(ctx: TenantLifecycleContext<DbOrTx>): Promise<void> {
  const { db: tx, tenantId, appId, userId } = ctx;
  const now = new Date();
  const [existingAccount] = await tx.select({ id: bankAccounts.id }).from(bankAccounts)
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), eq(bankAccounts.isPrivate, false), isNull(bankAccounts.archivedAt))).limit(1);
  const [existingEveryday] = await tx.select({ id: envelopes.id }).from(envelopes)
    .where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), eq(envelopes.envelopeType, "EVERYDAY"), eq(envelopes.isPrivate, false), isNull(envelopes.archivedAt))).limit(1);
  const { bankAccountId, everydayEnvelopeId } = await seedMinimalWorkspace(tx, {
    tenantId, appId, userId, existingBankAccountId: existingAccount?.id ?? null, existingEverydayEnvelopeId: existingEveryday?.id ?? null,
  });
  if (existingEveryday) {
    await tx.update(envelopes).set({ bankAccountId, isSurplusTarget: true, isPrivate: false, updatedAt: now, updatedBy: userId }).where(eq(envelopes.id, existingEveryday.id));
  }
  await archiveNonMinimalEntities(tx, tenantId, appId, userId, bankAccountId, everydayEnvelopeId, now);
}

async function seedPartnerPrivateAccount(ctx: TenantLifecycleContext<DbOrTx>): Promise<void> {
  const { db, tenantId, appId, userId } = ctx;
  const [existingPrivateAcc] = await db
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId)))
    .limit(1);
  if (existingPrivateAcc) return;

  const [partnerAcc] = await db
    .insert(bankAccounts)
    .values({
      tenantId, appId, name: "Personal Private Account", lastKnownBalance: "0.00",
      unbudgetedBuffer: "0.00", isPrivate: true, userId, createdBy: userId, updatedBy: userId,
    })
    .returning();

  await db.insert(envelopes).values({
    tenantId, appId, name: "Personal Spending", envelopeType: "EVERYDAY",
    bankAccountId: partnerAcc.id, monthlyAmount: "200.00", isPrivate: true,
    userId, createdBy: userId, updatedBy: userId,
  });
}

async function purgeMoneyMattersTables(ctx: TenantLifecycleContext<DbOrTx>): Promise<{ fileKeysToDelete: string[] }> {
  const { db: tx, tenantId, appId } = ctx;
  await tx.delete(transactionLedger).where(and(eq(transactionLedger.tenantId, tenantId), eq(transactionLedger.appId, appId)));

  const plans = await tx.select({ id: allocationPlans.id }).from(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));
  const planIds = plans.map((p) => p.id);
  if (planIds.length > 0) await tx.delete(allocationPlanLines).where(inArray(allocationPlanLines.planId, planIds));
  await tx.delete(allocationPlans).where(and(eq(allocationPlans.tenantId, tenantId), eq(allocationPlans.appId, appId)));

  const strategies = await tx.select({ id: allocationStrategies.id }).from(allocationStrategies).where(and(eq(allocationStrategies.tenantId, tenantId), eq(allocationStrategies.appId, appId)));
  const strategyIds = strategies.map((s) => s.id);
  if (strategyIds.length > 0) await tx.delete(allocationStrategySteps).where(inArray(allocationStrategySteps.strategyId, strategyIds));
  await tx.delete(allocationStrategies).where(and(eq(allocationStrategies.tenantId, tenantId), eq(allocationStrategies.appId, appId)));

  const noteFiles = await tx.select({ fileKey: fileNotes.fileKey }).from(fileNotes).where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));
  const fileKeysToDelete = noteFiles.map((n) => n.fileKey).filter((k): k is string => typeof k === "string" && k.length > 0);
  await tx.delete(fileNotes).where(and(eq(fileNotes.tenantId, tenantId), eq(fileNotes.appId, appId)));

  await tx.delete(expenseEvents).where(and(eq(expenseEvents.tenantId, tenantId), eq(expenseEvents.appId, appId)));
  await tx.delete(transferEvents).where(and(eq(transferEvents.tenantId, tenantId), eq(transferEvents.appId, appId)));
  await tx.delete(incomeEvents).where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
  await tx.delete(incomeSources).where(and(eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId)));
  await tx.delete(envelopes).where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId)));
  await tx.delete(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId)));
  return { fileKeysToDelete };
}

export function createMoneyMattersTenantLifecycleHooks(options?: {
  getPresignedDownloadUrl?: (fileKey: string, expiresIn?: number) => Promise<string>;
}): TenantLifecycleHooks<DbOrTx> {
  return {
    onTenantCreated: async (ctx) => {
      await seedMinimalWorkspace(ctx.db, ctx);
    },
    onSetupCancelled: ensureMinimalWorkspaceOnCancel,
    onEnrichTenantDetails: async ({ db, tenantId, appId }) => {
      const [accounts, tenantPools] = await Promise.all([
        db.select().from(bankAccounts).where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.appId, appId), isNull(bankAccounts.archivedAt))),
        db.select().from(envelopes).where(and(eq(envelopes.tenantId, tenantId), eq(envelopes.appId, appId), isNull(envelopes.archivedAt))),
      ]);
      return { bankAccounts: accounts, envelopes: tenantPools };
    },
    onMemberJoined: seedPartnerPrivateAccount,
    onMemberRemoved: async ({ db, tenantId, userId, removedUserId }) => {
      const privateBankAccs = await db.select({ id: bankAccounts.id }).from(bankAccounts)
        .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.userId, removedUserId), eq(bankAccounts.isPrivate, true)));
      const privateBankAccIds = privateBankAccs.map((b) => b.id);
      if (privateBankAccIds.length === 0) return;
      const privateEnvs = await db.select({ id: envelopes.id }).from(envelopes).where(inArray(envelopes.bankAccountId, privateBankAccIds));
      const privateEnvIds = privateEnvs.map((p) => p.id);
      const now = new Date();
      if (privateEnvIds.length > 0) {
        await db.update(envelopes).set({ archivedAt: now, updatedAt: now, updatedBy: userId }).where(inArray(envelopes.id, privateEnvIds));
      }
      await db.update(bankAccounts).set({ archivedAt: now, updatedAt: now, updatedBy: userId }).where(inArray(bankAccounts.id, privateBankAccIds));
    },
    onMemberLeft: async ({ db: tx, tenantId, userId }) => {
      const privateBankAccs = await tx.select({ id: bankAccounts.id }).from(bankAccounts)
        .where(and(eq(bankAccounts.tenantId, tenantId), eq(bankAccounts.userId, userId), eq(bankAccounts.isPrivate, true)));
      const privateBankAccIds = privateBankAccs.map((b) => b.id);
      if (privateBankAccIds.length > 0) {
        await tx.delete(envelopes).where(inArray(envelopes.bankAccountId, privateBankAccIds));
        await tx.delete(bankAccounts).where(inArray(bankAccounts.id, privateBankAccIds));
      }
    },
    onTenantDeleting: purgeMoneyMattersTables,
    onExportTenantData: (ctx) => exportMoneyMattersTenantCsvs(ctx, options?.getPresignedDownloadUrl),
  };
}
