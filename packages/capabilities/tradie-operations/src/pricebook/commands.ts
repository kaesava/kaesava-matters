import { and, eq, isNull } from "drizzle-orm";
import { tmPricebookItems, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { CreatePricebookItemInputType, UpdatePricebookItemInputType } from "./schemas.js";
import { TRADE_STARTER_PACKS, type TradePackKey } from "./starter-packs.js";
import { mapPricebookCsv, type PricebookCsvSource } from "./csv-mappers.js";

export interface PricebookActor {
  tenantId: string;
  appId: string;
  userId: string;
}

export async function createPricebookItemCommand(
  db: DbOrTx,
  actor: PricebookActor,
  input: CreatePricebookItemInputType
) {
  const now = new Date();
  const [created] = await db
    .insert(tmPricebookItems)
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

export async function updatePricebookItemCommand(
  db: DbOrTx,
  actor: PricebookActor,
  input: UpdatePricebookItemInputType
) {
  const { id, ...fields } = input;
  const [updated] = await db
    .update(tmPricebookItems)
    .set({ ...fields, updatedAt: new Date(), updatedBy: actor.userId })
    .where(
      and(
        eq(tmPricebookItems.id, id),
        eq(tmPricebookItems.tenantId, actor.tenantId),
        eq(tmPricebookItems.appId, actor.appId),
        isNull(tmPricebookItems.archivedAt)
      )
    )
    .returning();
  if (!updated) throw new Error("Pricebook item not found.");
  return updated;
}

export async function archivePricebookItemCommand(
  db: DbOrTx,
  actor: PricebookActor,
  id: string
) {
  const now = new Date();
  const [archived] = await db
    .update(tmPricebookItems)
    .set({ archivedAt: now, archivedBy: actor.userId, updatedAt: now, updatedBy: actor.userId })
    .where(
      and(
        eq(tmPricebookItems.id, id),
        eq(tmPricebookItems.tenantId, actor.tenantId),
        eq(tmPricebookItems.appId, actor.appId),
        isNull(tmPricebookItems.archivedAt)
      )
    )
    .returning();
  if (!archived) throw new Error("Pricebook item not found.");
  return archived;
}

async function batchInsertPricebookItems(
  db: DbOrTx,
  actor: PricebookActor,
  items: CreatePricebookItemInputType[]
) {
  if (items.length === 0) return [];
  const now = new Date();
  return db
    .insert(tmPricebookItems)
    .values(
      items.map((item) => ({
        ...item,
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

export async function installStarterPackCommand(
  db: DbOrTx,
  actor: PricebookActor,
  packKey: TradePackKey
) {
  const pack = TRADE_STARTER_PACKS[packKey];
  const inserted = await batchInsertPricebookItems(db, actor, pack.items);
  return { packKey, insertedCount: inserted.length, items: inserted };
}

export async function importPricebookCsvCommand(
  db: DbOrTx,
  actor: PricebookActor,
  source: PricebookCsvSource,
  csvText: string
) {
  const items = mapPricebookCsv(source, csvText);
  const inserted = await batchInsertPricebookItems(db, actor, items);
  return { source, importedCount: inserted.length, items: inserted };
}
