import { and, gte, inArray, isNull, lte, eq } from "drizzle-orm";
import {
  tmJobs,
  tmJobVisitAssignees,
  tmJobVisits,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { GetDispatchBoardInputType } from "./schemas.js";

export async function getDispatchBoardQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  input: GetDispatchBoardInputType
) {
  const start = new Date(input.rangeStart);
  const end = new Date(input.rangeEnd);

  const visits = await db
    .select()
    .from(tmJobVisits)
    .where(
      and(
        eq(tmJobVisits.tenantId, tenantId),
        eq(tmJobVisits.appId, appId),
        isNull(tmJobVisits.archivedAt),
        gte(tmJobVisits.scheduledEnd, start),
        lte(tmJobVisits.scheduledStart, end)
      )
    );

  const visitIds = visits.map((v) => v.id);
  const assignees =
    visitIds.length > 0
      ? await db
          .select()
          .from(tmJobVisitAssignees)
          .where(
            and(
              eq(tmJobVisitAssignees.tenantId, tenantId),
              inArray(tmJobVisitAssignees.visitId, visitIds),
              isNull(tmJobVisitAssignees.archivedAt)
            )
          )
      : [];

  const filteredVisits = input.assigneeUserId
    ? visits.filter((v) =>
        assignees.some((a) => a.visitId === v.id && a.userId === input.assigneeUserId)
      )
    : visits;

  const unscheduledJobs = await db
    .select()
    .from(tmJobs)
    .where(
      and(
        eq(tmJobs.tenantId, tenantId),
        eq(tmJobs.appId, appId),
        isNull(tmJobs.archivedAt),
        isNull(tmJobs.scheduledStart)
      )
    );

  return {
    visits: filteredVisits.map((visit) => ({
      ...visit,
      assignees: assignees.filter((a) => a.visitId === visit.id),
    })),
    unscheduledJobs,
  };
}
