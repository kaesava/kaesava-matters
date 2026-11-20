import {
  envelopes,
  bankAccounts,
  allocationStrategies,
  allocationStrategySteps,
  type DbOrTx,
} from "@money-matters/db";
import { and, eq, isNull, ne } from "drizzle-orm";

async function syncHouseholdSweepStep(
  tx: DbOrTx,
  envelopeId: string,
  tenantId: string,
  appId: string,
  userId: string,
  now: Date
): Promise<void> {
  const [householdStrategy] = await tx
    .select({ id: allocationStrategies.id })
    .from(allocationStrategies)
    .where(
      and(
        eq(allocationStrategies.tenantId, tenantId),
        eq(allocationStrategies.appId, appId),
        eq(allocationStrategies.isDefault, true),
        eq(allocationStrategies.isPrivate, false),
        isNull(allocationStrategies.archivedAt)
      )
    )
    .limit(1);

  if (!householdStrategy) return;

  await tx
    .update(allocationStrategySteps)
    .set({
      targetEnvelopeId: envelopeId,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(
      and(
        eq(allocationStrategySteps.strategyId, householdStrategy.id),
        eq(allocationStrategySteps.tenantId, tenantId),
        eq(allocationStrategySteps.stepType, "SURPLUS_SWEEP"),
        isNull(allocationStrategySteps.archivedAt)
      )
    );
}

/**
 * Designates a single shared envelope (of any type) as the household Shortfall/Surplus target
 * and synchronizes the household SURPLUS_SWEEP allocation strategy step.
 */
export async function setSurplusTargetCommand(
  envelopeId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  return dbClient.transaction(async (tx) => {
    const [row] = await tx
      .select({
        envelope: envelopes,
        bankIsPrivate: bankAccounts.isPrivate,
      })
      .from(envelopes)
      .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
      .where(
        and(
          eq(envelopes.id, envelopeId),
          eq(envelopes.tenantId, tenantId),
          eq(envelopes.appId, appId),
          isNull(envelopes.archivedAt)
        )
      )
      .limit(1);

    if (!row) {
      throw new Error("Envelope not found.");
    }

    if (row.envelope.isPrivate || row.bankIsPrivate) {
      throw new Error("Only shared envelopes can be set as the Shortfall/Surplus target.");
    }

    const now = new Date();
    if (!row.envelope.isSurplusTarget) {
      await tx
        .update(envelopes)
        .set({ isSurplusTarget: false, updatedAt: now, updatedBy: userId })
        .where(
          and(
            eq(envelopes.tenantId, tenantId),
            eq(envelopes.appId, appId),
            eq(envelopes.isSurplusTarget, true),
            ne(envelopes.id, envelopeId)
          )
        );
    }

    const [updated] = row.envelope.isSurplusTarget
      ? [row.envelope]
      : await tx
          .update(envelopes)
          .set({ isSurplusTarget: true, updatedAt: now, updatedBy: userId })
          .where(eq(envelopes.id, envelopeId))
          .returning();

    await syncHouseholdSweepStep(tx, envelopeId, tenantId, appId, userId, now);
    return updated;
  });
}
