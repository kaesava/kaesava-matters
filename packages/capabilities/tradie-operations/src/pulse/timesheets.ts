import { and, desc, eq, isNull } from "drizzle-orm";
import { tmJobs, tmTimeEntries, users, type DbOrTx } from "@kaesava/db/rings/tradie-matters";

export async function listTimesheetsQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  jobId?: string
) {
  const filters = [
    eq(tmTimeEntries.tenantId, tenantId),
    eq(tmTimeEntries.appId, appId),
    isNull(tmTimeEntries.archivedAt),
  ];
  if (jobId) filters.push(eq(tmTimeEntries.jobId, jobId));

  return db
    .select({
      entry: tmTimeEntries,
      jobNumber: tmJobs.jobNumber,
      jobTitle: tmJobs.title,
      workerName: users.displayName,
      workerEmail: users.email,
    })
    .from(tmTimeEntries)
    .leftJoin(tmJobs, eq(tmTimeEntries.jobId, tmJobs.id))
    .leftJoin(users, eq(tmTimeEntries.userId, users.id))
    .where(and(...filters))
    .orderBy(desc(tmTimeEntries.startedAt));
}

export async function approveTimesheetCommand(
  db: DbOrTx,
  ctx: { tenantId: string; appId: string; userId: string },
  input: { entryId: string; isBillable: boolean; durationMinutes?: number; notes?: string }
) {
  const now = new Date();
  const [updated] = await db
    .update(tmTimeEntries)
    .set({
      isBillable: input.isBillable,
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(
      and(
        eq(tmTimeEntries.id, input.entryId),
        eq(tmTimeEntries.tenantId, ctx.tenantId),
        eq(tmTimeEntries.appId, ctx.appId),
        isNull(tmTimeEntries.archivedAt)
      )
    )
    .returning();
  if (!updated) throw new Error("Timesheet entry not found.");
  return updated;
}
