import { and, count, eq, isNull } from "drizzle-orm";
import {
  tmBusinessProfiles,
  tmJobs,
  tmVariationLines,
  tmVariations,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { ApproveVariationInputType, CreateVariationInputType } from "./schemas.js";
import type { FieldActor } from "./timers.js";

function computeVariationTotals(
  lines: CreateVariationInputType["lines"],
  taxRatePct: number
) {
  let totalEx = 0;
  let totalTax = 0;
  const computedLines = lines.map((line, index) => {
    const qty = Number.parseFloat(line.quantity);
    const sell = Number.parseFloat(line.unitSellPriceExTax);
    const lineEx = qty * sell;
    const lineTax = line.taxCode === "GST" ? lineEx * (taxRatePct / 100) : 0;
    totalEx += lineEx;
    totalTax += lineTax;
    return {
      ...line,
      sortOrder: line.sortOrder ?? index,
      lineTotalExTax: lineEx.toFixed(2),
    };
  });
  return {
    computedLines,
    totalExTax: totalEx.toFixed(2),
    totalTax: totalTax.toFixed(2),
    totalIncTax: (totalEx + totalTax).toFixed(2),
  };
}

export async function createVariationCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: CreateVariationInputType
) {
  const [biz] = await db
    .select({ taxPct: tmBusinessProfiles.defaultTaxRatePercent })
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, actor.tenantId), eq(tmBusinessProfiles.appId, actor.appId)))
    .limit(1);
  const taxRatePct = Number.parseFloat(biz?.taxPct ?? "10.00");

  const [seqRow] = await db
    .select({ total: count() })
    .from(tmVariations)
    .where(and(eq(tmVariations.tenantId, actor.tenantId), eq(tmVariations.jobId, input.jobId)));
  const variationNumber = input.variationNumber ?? `VAR-${String(Number(seqRow?.total ?? 0) + 1).padStart(3, "0")}`;

  const totals = computeVariationTotals(input.lines, taxRatePct);
  const now = new Date();
  const [variation] = await db
    .insert(tmVariations)
    .values({
      jobId: input.jobId,
      variationNumber,
      title: input.title,
      description: input.description ?? null,
      status: "DRAFT",
      totalExTax: totals.totalExTax,
      totalTax: totals.totalTax,
      totalIncTax: totals.totalIncTax,
      tenantId: actor.tenantId,
      appId: actor.appId,
      createdAt: now,
      createdBy: actor.userId,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .returning();
  if (!variation) throw new Error("Failed to create variation.");

  const lines = await db
    .insert(tmVariationLines)
    .values(
      totals.computedLines.map((line) => ({
        variationId: variation.id,
        pricebookItemId: line.pricebookItemId ?? null,
        description: line.description,
        quantity: line.quantity,
        unitCostExTax: line.unitCostExTax,
        unitSellPriceExTax: line.unitSellPriceExTax,
        taxCode: line.taxCode,
        lineTotalExTax: line.lineTotalExTax,
        sortOrder: line.sortOrder,
        tenantId: actor.tenantId,
        appId: actor.appId,
        createdAt: now,
        createdBy: actor.userId,
        updatedAt: now,
        updatedBy: actor.userId,
      }))
    )
    .returning();

  return { variation, lines };
}

export async function approveVariationCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: ApproveVariationInputType
) {
  const now = new Date();
  const [variation] = await db
    .update(tmVariations)
    .set({
      status: "APPROVED",
      approvedAt: now,
      approvedByName: input.approvedByName,
      updatedAt: now,
      updatedBy: actor.userId,
    })
    .where(
      and(
        eq(tmVariations.id, input.variationId),
        eq(tmVariations.tenantId, actor.tenantId),
        eq(tmVariations.appId, actor.appId),
        isNull(tmVariations.archivedAt)
      )
    )
    .returning();
  if (!variation) throw new Error("Variation not found.");

  await db
    .update(tmJobs)
    .set({ hasUnbilledExtras: true, updatedAt: now, updatedBy: actor.userId })
    .where(and(eq(tmJobs.id, variation.jobId), eq(tmJobs.tenantId, actor.tenantId)));

  return variation;
}
