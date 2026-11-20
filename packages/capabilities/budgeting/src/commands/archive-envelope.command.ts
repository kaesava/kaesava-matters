import { envelopes, expenseEvents, bankAccounts, DbOrTx } from "@money-matters/db";
import { eq, and, isNull } from "drizzle-orm";

export async function archiveEnvelopeCommand(
  envelopeId: string,
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  const [envelope] = await dbClient
    .select({
      id: envelopes.id,
      envelopeType: envelopes.envelopeType,
      isSurplusTarget: envelopes.isSurplusTarget,
      isPrivate: envelopes.isPrivate,
      userId: envelopes.userId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId)
      )
    );

  if (!envelope) throw new Error("Envelope not found.");

  if (
    (envelope.isPrivate && envelope.userId !== userId) ||
    (envelope.bankAccountIsPrivate && envelope.bankAccountUserId !== userId)
  ) {
    throw new Error("Envelope not found.");
  }

  if (envelope.envelopeType === "EVERYDAY") {
    throw new Error("The Everyday envelope cannot be archived.");
  }

  if (envelope.isSurplusTarget && !envelope.isPrivate) {
    throw new Error("Cannot archive an envelope designated as the household Surplus Sweep Target. Please designate another envelope as the Surplus Sweep Target first.");
  }

  const archiveTimestamp = new Date();

  // Soft-archive all pending (unconfirmed) expense events with matching timestamp
  // so restoring the envelope restores only events archived with it (zero re-bursting).
  await dbClient
    .update(expenseEvents)
    .set({
      archivedAt: archiveTimestamp,
      archivedBy: userId,
      updatedBy: userId,
      updatedAt: archiveTimestamp,
    })
    .where(
      and(
        eq(expenseEvents.envelopeId, envelopeId),
        eq(expenseEvents.status, "PENDING"),
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        isNull(expenseEvents.archivedAt)
      )
    );

  const [archived] = await dbClient
    .update(envelopes)
    .set({
      archivedAt: archiveTimestamp,
      archivedBy: userId,
      updatedBy: userId,
      updatedAt: archiveTimestamp,
    })
    .where(
      and(
        eq(envelopes.id, envelopeId),
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId)
      )
    )
    .returning();

  if (envelope.isPrivate || envelope.bankAccountIsPrivate) {
    const { resetContributionsIfNoPrivateEnvelopes } = await import("./reset-contributions-if-no-private.js");
    await resetContributionsIfNoPrivateEnvelopes(tenantId, appId, userId, dbClient);
  }

  return archived;
}
