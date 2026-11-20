import { allocationPlans, allocationPlanLines, type DbOrTx } from "@money-matters/db";
import { and, eq, inArray, sql } from "drizzle-orm";

/**
 * Soft-deletes any active PENDING allocation plan and its lines for an income event
 * when the event is deleted or its amount/contribution changes outside the payday planner.
 */
export async function archivePendingPlansForIncomeEvent(
  incomeEventId: string,
  tenantId: string,
  appId: string,
  userId: string,
  tx: DbOrTx
): Promise<void> {
  const now = new Date();
  const archivedPlans = await tx
    .update(allocationPlans)
    .set({
      archivedAt: now,
      archivedBy: userId,
      updatedAt: now,
      updatedBy: userId,
    })
    .where(
      and(
        eq(allocationPlans.incomeEventId, incomeEventId),
        eq(allocationPlans.tenantId, tenantId),
        eq(allocationPlans.appId, appId),
        eq(allocationPlans.status, "PENDING"),
        sql`${allocationPlans.archivedAt} IS NULL`
      )
    )
    .returning({ id: allocationPlans.id });

  if (archivedPlans.length > 0) {
    await tx
      .update(allocationPlanLines)
      .set({
        archivedAt: now,
        archivedBy: userId,
        updatedAt: now,
        updatedBy: userId,
      })
      .where(
        inArray(
          allocationPlanLines.planId,
          archivedPlans.map((p) => p.id)
        )
      );
  }
}
