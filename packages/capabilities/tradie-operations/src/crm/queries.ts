import { and, desc, eq, ilike, isNull, or } from "drizzle-orm";
import {
  tmCustomers,
  tmCustomerSites,
  tmJobs,
  tmSites,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";

export async function listCustomersQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  search?: string,
  limit = 50
) {
  const term = search?.trim();
  const searchCond = term
    ? or(
        ilike(tmCustomers.name, `%${term}%`),
        ilike(tmCustomers.companyName, `%${term}%`),
        ilike(tmCustomers.email, `%${term}%`)
      )
    : undefined;

  return db
    .select()
    .from(tmCustomers)
    .where(
      and(
        eq(tmCustomers.tenantId, tenantId),
        eq(tmCustomers.appId, appId),
        isNull(tmCustomers.archivedAt),
        searchCond
      )
    )
    .orderBy(desc(tmCustomers.updatedAt))
    .limit(limit);
}

export async function getCustomerQuery(db: DbOrTx, tenantId: string, appId: string, id: string) {
  const [customer] = await db
    .select()
    .from(tmCustomers)
    .where(
      and(
        eq(tmCustomers.id, id),
        eq(tmCustomers.tenantId, tenantId),
        eq(tmCustomers.appId, appId),
        isNull(tmCustomers.archivedAt)
      )
    )
    .limit(1);
  return customer ?? null;
}

export async function listSitesQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  search?: string,
  limit = 50
) {
  const term = search?.trim();
  const searchCond = term
    ? or(
        ilike(tmSites.name, `%${term}%`),
        ilike(tmSites.addressLine1, `%${term}%`),
        ilike(tmSites.suburb, `%${term}%`)
      )
    : undefined;

  return db
    .select()
    .from(tmSites)
    .where(
      and(eq(tmSites.tenantId, tenantId), eq(tmSites.appId, appId), isNull(tmSites.archivedAt), searchCond)
    )
    .orderBy(desc(tmSites.updatedAt))
    .limit(limit);
}

export async function getSiteQuery(db: DbOrTx, tenantId: string, appId: string, id: string) {
  const [site] = await db
    .select()
    .from(tmSites)
    .where(
      and(eq(tmSites.id, id), eq(tmSites.tenantId, tenantId), eq(tmSites.appId, appId), isNull(tmSites.archivedAt))
    )
    .limit(1);
  return site ?? null;
}

export async function getCustomerHistoryQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  customerId: string
) {
  const customer = await getCustomerQuery(db, tenantId, appId, customerId);
  if (!customer) return null;

  const sites = await db
    .select({
      linkId: tmCustomerSites.id,
      relationshipRole: tmCustomerSites.relationshipRole,
      isPrimary: tmCustomerSites.isPrimary,
      site: tmSites,
    })
    .from(tmCustomerSites)
    .innerJoin(tmSites, eq(tmCustomerSites.siteId, tmSites.id))
    .where(
      and(
        eq(tmCustomerSites.tenantId, tenantId),
        eq(tmCustomerSites.appId, appId),
        eq(tmCustomerSites.customerId, customerId),
        isNull(tmCustomerSites.archivedAt),
        isNull(tmSites.archivedAt)
      )
    );

  const jobs = await db
    .select()
    .from(tmJobs)
    .where(
      and(
        eq(tmJobs.tenantId, tenantId),
        eq(tmJobs.appId, appId),
        eq(tmJobs.customerId, customerId),
        isNull(tmJobs.archivedAt)
      )
    )
    .orderBy(desc(tmJobs.createdAt));

  return { customer, sites, jobs };
}

export async function getSiteHistoryQuery(db: DbOrTx, tenantId: string, appId: string, siteId: string) {
  const site = await getSiteQuery(db, tenantId, appId, siteId);
  if (!site) return null;

  const customers = await db
    .select({
      linkId: tmCustomerSites.id,
      relationshipRole: tmCustomerSites.relationshipRole,
      isPrimary: tmCustomerSites.isPrimary,
      customer: tmCustomers,
    })
    .from(tmCustomerSites)
    .innerJoin(tmCustomers, eq(tmCustomerSites.customerId, tmCustomers.id))
    .where(
      and(
        eq(tmCustomerSites.tenantId, tenantId),
        eq(tmCustomerSites.appId, appId),
        eq(tmCustomerSites.siteId, siteId),
        isNull(tmCustomerSites.archivedAt),
        isNull(tmCustomers.archivedAt)
      )
    );

  const jobs = await db
    .select()
    .from(tmJobs)
    .where(
      and(eq(tmJobs.tenantId, tenantId), eq(tmJobs.appId, appId), eq(tmJobs.siteId, siteId), isNull(tmJobs.archivedAt))
    )
    .orderBy(desc(tmJobs.createdAt));

  return { site, customers, jobs };
}
