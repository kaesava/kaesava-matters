import { and, desc, eq, isNull } from "drizzle-orm";
import {
  tmBusinessProfiles,
  tmJobs,
  tmJobVisits,
  tmTeamMemberProfiles,
  tmTimeEntries,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { CheckInVisitInputType, CheckOutVisitInputType } from "./schemas.js";

export interface FieldActor {
  tenantId: string;
  appId: string;
  userId: string;
}

async function resolveRateSnapshots(db: DbOrTx, actor: FieldActor) {
  const [member] = await db
    .select({
      cost: tmTeamMemberProfiles.internalHourlyCostRate,
      charge: tmTeamMemberProfiles.defaultChargeOutRate,
    })
    .from(tmTeamMemberProfiles)
    .where(
      and(
        eq(tmTeamMemberProfiles.tenantId, actor.tenantId),
        eq(tmTeamMemberProfiles.appId, actor.appId),
        eq(tmTeamMemberProfiles.userId, actor.userId),
        isNull(tmTeamMemberProfiles.archivedAt)
      )
    )
    .limit(1);

  const [biz] = await db
    .select({ defaultCharge: tmBusinessProfiles.defaultHourlyChargeRate })
    .from(tmBusinessProfiles)
    .where(
      and(
        eq(tmBusinessProfiles.tenantId, actor.tenantId),
        eq(tmBusinessProfiles.appId, actor.appId),
        isNull(tmBusinessProfiles.archivedAt)
      )
    )
    .limit(1);

  return {
    hourlyCostSnapshot: member?.cost ?? "0.00",
    hourlyChargeSnapshot: member?.charge ?? biz?.defaultCharge ?? "0.00",
  };
}

export async function checkInVisitCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: CheckInVisitInputType
) {
  if (input.clientMutationId) {
    const [dup] = await db
      .select()
      .from(tmJobVisits)
      .where(
        and(
          eq(tmJobVisits.tenantId, actor.tenantId),
          eq(tmJobVisits.clientMutationId, input.clientMutationId)
        )
      )
      .limit(1);
    if (dup) return dup;
  }

  const now = input.timestamp ? new Date(input.timestamp) : new Date();
  const [visit] = await db
    .update(tmJobVisits)
    .set({
      status: "CHECKED_IN",
      actualCheckInAt: now,
      checkInLat: input.latitude ?? null,
      checkInLng: input.longitude ?? null,
      visitNotes: input.visitNotes ?? undefined,
      clientMutationId: input.clientMutationId ?? undefined,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    })
    .where(
      and(
        eq(tmJobVisits.id, input.visitId),
        eq(tmJobVisits.tenantId, actor.tenantId),
        isNull(tmJobVisits.archivedAt)
      )
    )
    .returning();
  if (!visit) throw new Error("Visit not found.");

  await db
    .update(tmJobs)
    .set({ status: "IN_PROGRESS", updatedAt: new Date(), updatedBy: actor.userId })
    .where(and(eq(tmJobs.id, visit.jobId), eq(tmJobs.tenantId, actor.tenantId)));

  return visit;
}

export async function checkOutVisitCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: CheckOutVisitInputType
) {
  if (input.clientMutationId) {
    const [dupEntry] = await db
      .select()
      .from(tmTimeEntries)
      .where(
        and(
          eq(tmTimeEntries.tenantId, actor.tenantId),
          eq(tmTimeEntries.clientMutationId, input.clientMutationId)
        )
      )
      .limit(1);
    if (dupEntry) return { visit: null, timeEntry: dupEntry };
  }

  const outTime = input.timestamp ? new Date(input.timestamp) : new Date();
  const [visit] = await db
    .update(tmJobVisits)
    .set({
      status: "COMPLETED",
      actualCheckOutAt: outTime,
      checkOutLat: input.latitude ?? null,
      checkOutLng: input.longitude ?? null,
      visitNotes: input.visitNotes ?? undefined,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    })
    .where(
      and(
        eq(tmJobVisits.id, input.visitId),
        eq(tmJobVisits.tenantId, actor.tenantId),
        isNull(tmJobVisits.archivedAt)
      )
    )
    .returning();
  if (!visit) throw new Error("Visit not found.");

  const startedAt = visit.actualCheckInAt ?? visit.scheduledStart;
  const durationMinutes = Math.max(1, Math.round((outTime.getTime() - startedAt.getTime()) / 60000));
  const rates = await resolveRateSnapshots(db, actor);

  const [timeEntry] = await db
    .insert(tmTimeEntries)
    .values({
      jobId: visit.jobId,
      visitId: visit.id,
      userId: actor.userId,
      startedAt,
      endedAt: outTime,
      durationMinutes,
      isBillable: input.isBillable,
      hourlyCostSnapshot: rates.hourlyCostSnapshot,
      hourlyChargeSnapshot: rates.hourlyChargeSnapshot,
      invoicedInInvoiceId: null,
      notes: input.notes ?? null,
      clientMutationId: input.clientMutationId ?? null,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: new Date(),
      createdBy: actor.userId,
      updatedAt: new Date(),
      updatedBy: actor.userId,
    })
    .returning();

  return { visit, timeEntry };
}

export async function listTimeEntriesQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  jobId: string
) {
  return db
    .select()
    .from(tmTimeEntries)
    .where(
      and(
        eq(tmTimeEntries.tenantId, tenantId),
        eq(tmTimeEntries.appId, appId),
        eq(tmTimeEntries.jobId, jobId),
        isNull(tmTimeEntries.archivedAt)
      )
    )
    .orderBy(desc(tmTimeEntries.startedAt));
}
