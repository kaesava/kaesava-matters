import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  tmBusinessProfiles,
  tmInvoices,
  tmJobs,
  tmMaterialUsages,
  tmQuoteLines,
  tmQuotes,
  tmTimeEntries,
  tmVariationLines,
  tmVariations,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { createInvoiceCommand, sendInvoiceCommand, type InvoiceCommandContext } from "./commands.js";
import type { InvoiceLineInputType } from "./schemas.js";

async function collectAcceptedQuoteLines(db: DbOrTx, jobId: string): Promise<InvoiceLineInputType[]> {
  const [acceptedQuote] = await db
    .select()
    .from(tmQuotes)
    .where(and(eq(tmQuotes.jobId, jobId), eq(tmQuotes.status, "ACCEPTED"), isNull(tmQuotes.archivedAt)))
    .limit(1);
  if (!acceptedQuote) return [];
  const qLines = await db
    .select()
    .from(tmQuoteLines)
    .where(and(eq(tmQuoteLines.quoteId, acceptedQuote.id), isNull(tmQuoteLines.archivedAt)));
  const filtered = acceptedQuote.selectedOptionGroupId
    ? qLines.filter((l) => !l.optionGroupId || l.optionGroupId === acceptedQuote.selectedOptionGroupId)
    : qLines;
  const isInclusive = acceptedQuote.gstMode === "INCLUSIVE";
  return filtered.map((l, idx) => {
    const rawSell = Number(l.unitSellPrice);
    const unitSellPrice =
      isInclusive && l.taxCode !== "GST_FREE" ? Number((rawSell / 1.1).toFixed(2)) : rawSell;
    return {
      sourceType: "QUOTE" as const,
      sourceId: l.id,
      pricebookItemId: l.pricebookItemId,
      description: l.description,
      quantity: Number(l.quantity),
      unitCostExTax: Number(l.unitCostExTax),
      unitSellPrice,
      taxCode: l.taxCode === "GST_FREE" ? "GST_FREE" : "GST",
      sortOrder: idx,
    };
  });
}

async function collectApprovedVariationLines(db: DbOrTx, jobId: string): Promise<InvoiceLineInputType[]> {
  const approvedVars = await db
    .select()
    .from(tmVariations)
    .where(and(eq(tmVariations.jobId, jobId), eq(tmVariations.status, "APPROVED"), isNull(tmVariations.archivedAt)));
  if (approvedVars.length === 0) return [];
  const vLines = await db
    .select()
    .from(tmVariationLines)
    .where(and(inArray(tmVariationLines.variationId, approvedVars.map((v) => v.id)), isNull(tmVariationLines.archivedAt)));
  return vLines.map((l, idx) => ({
    sourceType: "VARIATION" as const,
    sourceId: l.id,
    pricebookItemId: l.pricebookItemId,
    description: l.description,
    quantity: Number(l.quantity),
    unitCostExTax: Number(l.unitCostExTax),
    unitSellPrice: Number(l.unitSellPriceExTax),
    taxCode: l.taxCode === "GST_FREE" ? "GST_FREE" : "GST",
    sortOrder: 100 + idx,
  }));
}

export async function convertJobToInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: {
    jobId: string;
    invoiceType?: "DEPOSIT" | "PROGRESS" | "FINAL";
    sendImmediately?: boolean;
    allowCardPayment?: boolean;
    dueDate?: string;
  }
) {
  const [job] = await db
    .select()
    .from(tmJobs)
    .where(and(eq(tmJobs.id, input.jobId), eq(tmJobs.tenantId, ctx.tenantId), isNull(tmJobs.archivedAt)))
    .limit(1);
  if (!job) throw new Error("Job not found.");

  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
    .limit(1);

  const [quoteLines, varLines, unbilledTime, unbilledMaterials, priorDeposits] = await Promise.all([
    collectAcceptedQuoteLines(db, job.id),
    collectApprovedVariationLines(db, job.id),
    db
      .select()
      .from(tmTimeEntries)
      .where(
        and(
          eq(tmTimeEntries.jobId, job.id),
          eq(tmTimeEntries.isBillable, true),
          isNull(tmTimeEntries.invoicedInInvoiceId),
          isNull(tmTimeEntries.archivedAt)
        )
      ),
    db
      .select()
      .from(tmMaterialUsages)
      .where(
        and(
          eq(tmMaterialUsages.jobId, job.id),
          eq(tmMaterialUsages.isBillable, true),
          isNull(tmMaterialUsages.invoicedInInvoiceId),
          isNull(tmMaterialUsages.archivedAt)
        )
      ),
    db
      .select()
      .from(tmInvoices)
      .where(
        and(
          eq(tmInvoices.jobId, job.id),
          inArray(tmInvoices.invoiceType, ["DEPOSIT", "PROGRESS"]),
          isNull(tmInvoices.archivedAt)
        )
      ),
  ]);

  const timeLines: InvoiceLineInputType[] = unbilledTime.map((t, idx) => ({
    sourceType: "TIME",
    sourceId: t.id,
    description: t.notes ? `Labour: ${t.notes}` : "Billable field labour",
    quantity: Number((t.durationMinutes / 60).toFixed(2)),
    unitCostExTax: Number(t.hourlyCostSnapshot),
    unitSellPrice: Number(t.hourlyChargeSnapshot),
    taxCode: "GST",
    sortOrder: 200 + idx,
  }));

  const matLines: InvoiceLineInputType[] = unbilledMaterials.map((m, idx) => ({
    sourceType: "MATERIAL",
    sourceId: m.id,
    pricebookItemId: m.pricebookItemId,
    description: m.description,
    quantity: Number(m.quantity),
    unitCostExTax: Number(m.unitCostSnapshot),
    unitSellPrice: Number(m.unitSellPriceExTax),
    taxCode: m.taxCode === "GST_FREE" ? "GST_FREE" : "GST",
    sortOrder: 300 + idx,
  }));

  const depositDeductions: InvoiceLineInputType[] = priorDeposits
    .filter((d) => d.status !== "VOID" && Number(d.amountPaid) > 0)
    .map((d, idx) => {
      const paidAmt = Number(d.amountPaid);
      const exTaxPaid = d.gstRegisteredSnapshot ? Number((paidAmt / 1.1).toFixed(2)) : paidAmt;
      return {
        sourceType: "DEPOSIT_DEDUCTION",
        sourceId: d.id,
        description: `Less prior payment (${d.invoiceNumber})`,
        quantity: 1,
        unitCostExTax: 0,
        unitSellPrice: -exTaxPaid,
        taxCode: d.gstRegisteredSnapshot ? "GST" : "GST_FREE",
        sortOrder: 400 + idx,
      };
    });

  const allLines = [...quoteLines, ...varLines, ...timeLines, ...matLines, ...depositDeductions];
  if (allLines.length === 0) {
    throw new Error("No billable quote, variation, time, or material items found for this job.");
  }

  const now = new Date();
  const issueDate = now.toISOString().slice(0, 10);
  const dueDate =
    input.dueDate ??
    new Date(now.getTime() + (profile?.defaultPaymentTermsDays ?? 14) * 86400000)
      .toISOString()
      .slice(0, 10);

  const invoice = await createInvoiceCommand(db, ctx, {
    invoiceType: input.invoiceType ?? "FINAL",
    customerId: job.customerId,
    siteId: job.siteId,
    jobId: job.id,
    issueDate,
    dueDate,
    allowCardPayment: input.allowCardPayment ?? true,
    chasingEnabled: true,
    chasingScheduleDaysJson: [-3, 3, 14],
    lines: allLines,
  });

  if (unbilledTime.length > 0) {
    await db
      .update(tmTimeEntries)
      .set({ invoicedInInvoiceId: invoice.id, updatedAt: now, updatedBy: ctx.userId })
      .where(inArray(tmTimeEntries.id, unbilledTime.map((t) => t.id)));
  }
  if (unbilledMaterials.length > 0) {
    await db
      .update(tmMaterialUsages)
      .set({ invoicedInInvoiceId: invoice.id, updatedAt: now, updatedBy: ctx.userId })
      .where(inArray(tmMaterialUsages.id, unbilledMaterials.map((m) => m.id)));
  }

  await db
    .update(tmJobs)
    .set({
      hasUnbilledExtras: false,
      status: job.status === "COMPLETED" ? "INVOICED" : job.status,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmJobs.id, job.id));

  if (input.sendImmediately) {
    return sendInvoiceCommand(db, ctx, invoice.id);
  }
  return { invoice, rawToken: null };
}
