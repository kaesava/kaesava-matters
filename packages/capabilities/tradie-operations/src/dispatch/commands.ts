import { and, eq, isNull } from "drizzle-orm";
import { tmJobs, tmJobVisitAssignees, tmJobVisits, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type {
  AssignVisitCrewInputType,
  CreateVisitInputType,
  RescheduleVisitInputType,
} from "./schemas.js";

export interface DispatchActor {
  tenantId: string;
  appId: string;
  userId: string;
}

export async function assignVisitCrewCommand(
  db: DbOrTx,
  actor: DispatchActor,
  input: AssignVisitCrewInputType
) {
  const now = new Date();
  await db
    .update(tmJobVisitAssignees)
    .set({ archivedAt: now, archivedBy: actor.userId, updatedAt: now, updatedBy: actor.userId })
    .where(
      and(
        eq(tmJobVisitAssignees.visitId, input.visitId),
        eq(tmJobVisitAssignees.tenantId, actor.tenantId),
        isNull(tmJobVisitAssignees.archivedAt)
      )
    );

  const uniqueIds = Array.from(new Set(input.assigneeUserIds));
  if (uniqueIds.length === 0) return [];
  return db
    .insert(tmJobVisitAssignees)
    .values(
      uniqueIds.map((userId) => ({
        visitId: input.visitId,
        userId,
        isLead: userId === input.leadUserId,
        tenantId: actor.tenantId,
        appId: actor.appId,
        createdAt: now,
        createdBy: actor.userId,
        updatedAt: now,
        updatedBy: actor.userId,
      }))
    )
    .returning();
}

export async function createVisitCommand(db: DbOrTx, actor: DispatchActor, input: CreateVisitInputType) {
  const now = new Date();
  const [visit] = await db
    .insert(tmJobVisits)
    .values({
      jobId: input.jobId,
      title: input.title,
      status: "SCHEDULED",
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      visitNotes: input.visitNotes ?? null,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .returning();
  if (!visit) throw new Error("Failed to create visit.");

  await db
    .update(tmJobs)
    .set({
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .where(and(eq(tmJobs.id, input.jobId), eq(tmJobs.tenantId, actor.tenantId)));

  const assignees = await assignVisitCrewCommand(db, actor, {
    visitId: visit.id,
    assigneeUserIds: input.assigneeUserIds,
    leadUserId: input.leadUserId,
  });
  return { visit, assignees };
}

export async function rescheduleVisitCommand(
  db: DbOrTx,
  actor: DispatchActor,
  input: RescheduleVisitInputType
) {
  const now = new Date();
  const [visit] = await db
    .update(tmJobVisits)
    .set({
      scheduledStart: new Date(input.scheduledStart),
      scheduledEnd: new Date(input.scheduledEnd),
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .where(
      and(
        eq(tmJobVisits.id, input.visitId),
        eq(tmJobVisits.tenantId, actor.tenantId),
        eq(tmJobVisits.appId, actor.appId),
        isNull(tmJobVisits.archivedAt)
      )
    )
    .returning();
  if (!visit) throw new Error("Visit not found.");

  if (input.assigneeUserIds) {
    await assignVisitCrewCommand(db, actor, {
      visitId: visit.id,
      assigneeUserIds: input.assigneeUserIds,
    });
  }
  return visit;
}
