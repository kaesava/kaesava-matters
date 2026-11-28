import { and, count, eq, isNull } from "drizzle-orm";
import { tmJobs, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { CreateJobInputType, UpdateJobInputType } from "./schemas.js";
import { assertJobTransition, type JobStatus } from "./workflow.js";

export interface JobActor {
  tenantId: string;
  appId: string;
  userId: string;
}

async function generateJobNumber(db: DbOrTx, tenantId: string, appId: string): Promise<string> {
  const [row] = await db
    .select({ total: count() })
    .from(tmJobs)
    .where(and(eq(tmJobs.tenantId, tenantId), eq(tmJobs.appId, appId)));
  const seq = Number(row?.total ?? 0) + 1;
  return `JOB-${String(seq).padStart(4, "0")}`;
}

export async function createJobCommand(db: DbOrTx, actor: JobActor, input: CreateJobInputType) {
  const now = new Date();
  const jobNumber = input.jobNumber ?? (await generateJobNumber(db, actor.tenantId, actor.appId));
  const [created] = await db
    .insert(tmJobs)
    .values({
      ...input,
      jobNumber,
      scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
      scheduledEnd: input.scheduledEnd ? new Date(input.scheduledEnd) : null,
      hasUnbilledExtras: input.hasUnbilledExtras ?? false,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .returning();
  return created;
}

export async function updateJobCommand(db: DbOrTx, actor: JobActor, input: UpdateJobInputType) {
  const { id, scheduledStart, scheduledEnd, completedAt, ...rest } = input;
  const [existing] = await db
    .select({ status: tmJobs.status })
    .from(tmJobs)
    .where(and(eq(tmJobs.id, id), eq(tmJobs.tenantId, actor.tenantId), eq(tmJobs.appId, actor.appId), isNull(tmJobs.archivedAt)))
    .limit(1);
  if (!existing) throw new Error("Job not found.");
  if (rest.status) assertJobTransition(existing.status as JobStatus, rest.status);

  const [updated] = await db
    .update(tmJobs)
    .set({
      ...rest,
      ...(scheduledStart !== undefined ? { scheduledStart: scheduledStart ? new Date(scheduledStart) : null } : {}),
      ...(scheduledEnd !== undefined ? { scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null } : {}),
      ...(completedAt !== undefined ? { completedAt: completedAt ? new Date(completedAt) : null } : {}),
      updatedAt: new Date(),
      updatedBy: actor.userId,
    })
    .where(eq(tmJobs.id, id))
    .returning();
  return updated;
}

export async function transitionJobStatusCommand(
  db: DbOrTx,
  actor: JobActor,
  id: string,
  nextStatus: JobStatus
) {
  const [existing] = await db
    .select({ status: tmJobs.status, completedAt: tmJobs.completedAt })
    .from(tmJobs)
    .where(and(eq(tmJobs.id, id), eq(tmJobs.tenantId, actor.tenantId), eq(tmJobs.appId, actor.appId), isNull(tmJobs.archivedAt)))
    .limit(1);
  if (!existing) throw new Error("Job not found.");
  assertJobTransition(existing.status as JobStatus, nextStatus);

  const now = new Date();
  const [updated] = await db
    .update(tmJobs)
    .set({
      status: nextStatus,
      completedAt: nextStatus === "COMPLETED" ? existing.completedAt ?? now : existing.completedAt,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .where(eq(tmJobs.id, id))
    .returning();
  return updated;
}

export async function archiveJobCommand(db: DbOrTx, actor: JobActor, id: string) {
  const now = new Date();
  const [archived] = await db
    .update(tmJobs)
    .set({ archivedAt: now, archivedBy: actor.userId, updatedAt: now, updatedBy: actor.userId })
    .where(and(eq(tmJobs.id, id), eq(tmJobs.tenantId, actor.tenantId), eq(tmJobs.appId, actor.appId), isNull(tmJobs.archivedAt)))
    .returning();
  if (!archived) throw new Error("Job not found.");
  return archived;
}
