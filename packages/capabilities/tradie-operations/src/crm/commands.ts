import { and, eq, isNull } from "drizzle-orm";
import { tmCustomers, tmCustomerSites, tmSites, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type {
  CreateCustomerInputType,
  CreateSiteInputType,
  LinkCustomerSiteInputType,
  UpdateCustomerInputType,
  UpdateSiteInputType,
} from "./schemas.js";

export interface CrmActor {
  tenantId: string;
  appId: string;
  userId: string;
}

export async function createCustomerCommand(db: DbOrTx, actor: CrmActor, input: CreateCustomerInputType) {
  const now = new Date();
  const [created] = await db
    .insert(tmCustomers)
    .values({
      ...input,
      creditBalance: input.creditBalance ?? "0.00",
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

export async function updateCustomerCommand(db: DbOrTx, actor: CrmActor, input: UpdateCustomerInputType) {
  const { id, ...fields } = input;
  const [updated] = await db
    .update(tmCustomers)
    .set({ ...fields, updatedAt: new Date(), updatedBy: actor.userId })
    .where(
      and(
        eq(tmCustomers.id, id),
        eq(tmCustomers.tenantId, actor.tenantId),
        eq(tmCustomers.appId, actor.appId),
        isNull(tmCustomers.archivedAt)
      )
    )
    .returning();
  if (!updated) throw new Error("Customer not found.");
  return updated;
}

export async function archiveCustomerCommand(db: DbOrTx, actor: CrmActor, id: string) {
  const now = new Date();
  const [archived] = await db
    .update(tmCustomers)
    .set({ archivedAt: now, archivedBy: actor.userId, updatedAt: now, updatedBy: actor.userId })
    .where(
      and(
        eq(tmCustomers.id, id),
        eq(tmCustomers.tenantId, actor.tenantId),
        eq(tmCustomers.appId, actor.appId),
        isNull(tmCustomers.archivedAt)
      )
    )
    .returning();
  if (!archived) throw new Error("Customer not found.");
  return archived;
}

export async function linkCustomerSiteCommand(db: DbOrTx, actor: CrmActor, input: LinkCustomerSiteInputType) {
  const now = new Date();
  const [existing] = await db
    .select()
    .from(tmCustomerSites)
    .where(
      and(
        eq(tmCustomerSites.tenantId, actor.tenantId),
        eq(tmCustomerSites.appId, actor.appId),
        eq(tmCustomerSites.customerId, input.customerId),
        eq(tmCustomerSites.siteId, input.siteId),
        isNull(tmCustomerSites.archivedAt)
      )
    )
    .limit(1);
  if (existing) {
    const [updated] = await db
      .update(tmCustomerSites)
      .set({
        relationshipRole: input.relationshipRole,
        isPrimary: input.isPrimary,
        updatedAt: now,
        updatedBy: actor.userId,
      })
      .where(eq(tmCustomerSites.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(tmCustomerSites)
    .values({
      ...input,
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

export async function createSiteCommand(db: DbOrTx, actor: CrmActor, input: CreateSiteInputType) {
  const { customerId, relationshipRole, isPrimary, ...siteFields } = input;
  const now = new Date();
  const [created] = await db
    .insert(tmSites)
    .values({
      ...siteFields,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .returning();
  if (customerId && created) {
    await linkCustomerSiteCommand(db, actor, {
      customerId,
      siteId: created.id,
      relationshipRole: relationshipRole ?? "OWNER",
      isPrimary: isPrimary ?? true,
    });
  }
  return created;
}

export async function updateSiteCommand(db: DbOrTx, actor: CrmActor, input: UpdateSiteInputType) {
  const { id, ...fields } = input;
  const [updated] = await db
    .update(tmSites)
    .set({ ...fields, updatedAt: new Date(), updatedBy: actor.userId })
    .where(
      and(
        eq(tmSites.id, id),
        eq(tmSites.tenantId, actor.tenantId),
        eq(tmSites.appId, actor.appId),
        isNull(tmSites.archivedAt)
      )
    )
    .returning();
  if (!updated) throw new Error("Site not found.");
  return updated;
}

export async function archiveSiteCommand(db: DbOrTx, actor: CrmActor, id: string) {
  const now = new Date();
  const [archived] = await db
    .update(tmSites)
    .set({ archivedAt: now, archivedBy: actor.userId, updatedAt: now, updatedBy: actor.userId })
    .where(
      and(
        eq(tmSites.id, id),
        eq(tmSites.tenantId, actor.tenantId),
        eq(tmSites.appId, actor.appId),
        isNull(tmSites.archivedAt)
      )
    )
    .returning();
  if (!archived) throw new Error("Site not found.");
  return archived;
}
