import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import {
  tmCustomers,
  tmJobAttachments,
  tmJobs,
  tmJobVisits,
  tmMaterialUsages,
  tmSites,
  tmTimeEntries,
  tmVariations,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";

export interface ListJobsFilter {
  status?: string;
  customerId?: string;
  search?: string;
  limit?: number;
}

export async function listJobsQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  filter: ListJobsFilter
) {
  const term = filter.search?.trim();
  const searchCond = term
    ? or(ilike(tmJobs.title, `%${term}%`), ilike(tmJobs.jobNumber, `%${term}%`))
    : undefined;

  return db
    .select()
    .from(tmJobs)
    .where(
      and(
        eq(tmJobs.tenantId, tenantId),
        eq(tmJobs.appId, appId),
        isNull(tmJobs.archivedAt),
        filter.status ? eq(tmJobs.status, filter.status) : undefined,
        filter.customerId ? eq(tmJobs.customerId, filter.customerId) : undefined,
        searchCond
      )
    )
    .orderBy(desc(tmJobs.updatedAt))
    .limit(filter.limit ?? 50);
}

async function fetchJobChildren(db: DbOrTx, tenantId: string, appId: string, jobId: string) {
  const [visits, timeEntries, variations, materialUsages, attachments] = await Promise.all([
    db
      .select()
      .from(tmJobVisits)
      .where(and(eq(tmJobVisits.jobId, jobId), eq(tmJobVisits.tenantId, tenantId), isNull(tmJobVisits.archivedAt))),
    db
      .select()
      .from(tmTimeEntries)
      .where(and(eq(tmTimeEntries.jobId, jobId), eq(tmTimeEntries.tenantId, tenantId), isNull(tmTimeEntries.archivedAt))),
    db
      .select()
      .from(tmVariations)
      .where(and(eq(tmVariations.jobId, jobId), eq(tmVariations.tenantId, tenantId), isNull(tmVariations.archivedAt))),
    db
      .select()
      .from(tmMaterialUsages)
      .where(and(eq(tmMaterialUsages.jobId, jobId), eq(tmMaterialUsages.tenantId, tenantId), isNull(tmMaterialUsages.archivedAt))),
    db
      .select()
      .from(tmJobAttachments)
      .where(and(eq(tmJobAttachments.jobId, jobId), eq(tmJobAttachments.tenantId, tenantId), eq(tmJobAttachments.appId, appId), isNull(tmJobAttachments.archivedAt))),
  ]);
  return { visits, timeEntries, variations, materialUsages, attachments };
}

export async function getJobDetailQuery(db: DbOrTx, tenantId: string, appId: string, jobId: string) {
  const [job] = await db
    .select()
    .from(tmJobs)
    .where(and(eq(tmJobs.id, jobId), eq(tmJobs.tenantId, tenantId), eq(tmJobs.appId, appId), isNull(tmJobs.archivedAt)))
    .limit(1);
  if (!job) return null;

  const [customer] = await db.select().from(tmCustomers).where(eq(tmCustomers.id, job.customerId)).limit(1);
  const site = job.siteId
    ? (await db.select().from(tmSites).where(eq(tmSites.id, job.siteId)).limit(1))[0] ?? null
    : null;
  const children = await fetchJobChildren(db, tenantId, appId, job.id);

  return { job, customer: customer ?? null, site, ...children };
}
