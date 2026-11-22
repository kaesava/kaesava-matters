import { envelopes, bankAccounts, incomeSources, incomeEvents, DbOrTx } from "@kaesava/db";
import { eq, and, sql, or, inArray } from "drizzle-orm";

export async function resetContributionsIfNoPrivateEnvelopes(
  tenantId: string,
  appId: string,
  userId: string,
  dbClient: DbOrTx
) {
  // Query remaining active private envelopes for this user
  const activePrivateEnvelopes = await dbClient
    .select({ id: envelopes.id })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`,
        or(
          and(eq(envelopes.isPrivate, true), eq(envelopes.userId, userId)),
          and(eq(bankAccounts.isPrivate, true), eq(bankAccounts.userId, userId))
        )
      )
    );

  if (activePrivateEnvelopes.length === 0) {
    const userPrivateAccounts = await dbClient
      .select({ id: bankAccounts.id })
      .from(bankAccounts)
      .where(
        and(
          eq(bankAccounts.tenantId, tenantId),
          eq(bankAccounts.appId, appId),
          eq(bankAccounts.isPrivate, true),
          eq(bankAccounts.userId, userId),
          sql`${bankAccounts.archivedAt} IS NULL`
        )
      );
    const privateAccountIds = userPrivateAccounts.map((a) => a.id);
    if (privateAccountIds.length === 0) return;

    const affectedSources = await dbClient
      .update(incomeSources)
      .set({
        contributionMode: "FULL",
        contributionValue: null,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(
        and(
          eq(incomeSources.tenantId, tenantId),
          eq(incomeSources.appId, appId),
          inArray(incomeSources.receivingAccountId, privateAccountIds),
          sql`${incomeSources.archivedAt} IS NULL`
        )
      )
      .returning({ id: incomeSources.id });

    const sourceIds = affectedSources.map((s) => s.id);
    if (sourceIds.length > 0) {
      await dbClient
        .update(incomeEvents)
        .set({
          contributionMode: "FULL",
          contributionValue: null,
          updatedAt: new Date(),
          updatedBy: userId,
        })
        .where(
          and(
            eq(incomeEvents.tenantId, tenantId),
            eq(incomeEvents.appId, appId),
            inArray(incomeEvents.incomeSourceId, sourceIds),
            sql`${incomeEvents.status} != 'CONFIRMED'`,
            sql`${incomeEvents.archivedAt} IS NULL`
          )
        );
    }
  }
}
