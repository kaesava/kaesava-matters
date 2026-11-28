import { and, eq, isNull } from "drizzle-orm";
import {
  tmJobAttachments,
  tmJobs,
  tmMaterialUsages,
  tmPricebookItems,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { AttachJobPhotoInputType, LogMaterialUsageInputType } from "./schemas.js";
import type { FieldActor } from "./timers.js";

async function resolveMaterialSnapshots(
  db: DbOrTx,
  tenantId: string,
  input: LogMaterialUsageInputType
) {
  if (!input.pricebookItemId) {
    return {
      unitCostSnapshot: input.unitCostSnapshot ?? "0.00",
      unitSellPriceExTax: input.unitSellPriceExTax ?? "0.00",
    };
  }
  const [item] = await db
    .select({
      unitCostExTax: tmPricebookItems.unitCostExTax,
      sellPriceExTax: tmPricebookItems.sellPriceExTax,
    })
    .from(tmPricebookItems)
    .where(and(eq(tmPricebookItems.id, input.pricebookItemId), eq(tmPricebookItems.tenantId, tenantId)))
    .limit(1);

  return {
    unitCostSnapshot: input.unitCostSnapshot ?? item?.unitCostExTax ?? "0.00",
    unitSellPriceExTax: input.unitSellPriceExTax ?? item?.sellPriceExTax ?? "0.00",
  };
}

export async function logMaterialUsageCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: LogMaterialUsageInputType
) {
  if (input.clientMutationId) {
    const [dup] = await db
      .select()
      .from(tmMaterialUsages)
      .where(
        and(
          eq(tmMaterialUsages.tenantId, actor.tenantId),
          eq(tmMaterialUsages.clientMutationId, input.clientMutationId)
        )
      )
      .limit(1);
    if (dup) return dup;
  }

  const snapshots = await resolveMaterialSnapshots(db, actor.tenantId, input);
  const now = new Date();
  const [created] = await db
    .insert(tmMaterialUsages)
    .values({
      jobId: input.jobId,
      visitId: input.visitId ?? null,
      pricebookItemId: input.pricebookItemId ?? null,
      description: input.description,
      quantity: input.quantity,
      unitCostSnapshot: snapshots.unitCostSnapshot,
      unitSellPriceExTax: snapshots.unitSellPriceExTax,
      taxCode: input.taxCode,
      isBillable: input.isBillable,
      invoicedInInvoiceId: null,
      clientMutationId: input.clientMutationId ?? null,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .returning();

  if (input.isBillable) {
    await db
      .update(tmJobs)
      .set({ hasUnbilledExtras: true, updatedAt: now, updatedBy: actor.userId })
      .where(and(eq(tmJobs.id, input.jobId), eq(tmJobs.tenantId, actor.tenantId), isNull(tmJobs.archivedAt)));
  }
  return created;
}

export async function attachJobPhotoCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: AttachJobPhotoInputType
) {
  const now = new Date();
  const [created] = await db
    .insert(tmJobAttachments)
    .values({
      jobId: input.jobId,
      visitId: input.visitId ?? null,
      fileNoteId: input.fileNoteId,
      photoCategory: input.photoCategory,
      visibility: input.visibility,
      caption: input.caption ?? null,
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
