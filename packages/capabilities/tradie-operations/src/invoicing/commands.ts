import { and, eq, isNull } from "drizzle-orm";
import { sendEmail } from "@kaesava/core";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { generatePortalToken } from "@kaesava/core";
import {
  tmBusinessProfiles,
  tmCommLogs,
  tmCustomers,
  tmInvoiceLines,
  tmInvoices,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { evaluateTaxInvoiceCompliance } from "./tax-invoice-rules.js";
import { renderInvoicePdf } from "./renderInvoicePdf.js";
import type { CreateInvoiceInputType, InvoiceLineInputType, UpdateInvoiceInputType } from "./schemas.js";

export interface InvoiceCommandContext {
  tenantId: string;
  appId: string;
  userId: string;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeInvoiceLines(lines: InvoiceLineInputType[], gstRegistered: boolean) {
  const computed = lines.map((l) => {
    const exTax = round2(l.quantity * l.unitSellPrice);
    const tax = gstRegistered && l.taxCode === "GST" ? round2(exTax * 0.1) : 0;
    return {
      ...l,
      lineTotalExTax: exTax,
      lineTax: tax,
      lineTotalIncTax: round2(exTax + tax),
    };
  });
  const subtotalExTax = round2(computed.reduce((s, l) => s + l.lineTotalExTax, 0));
  const totalTax = round2(computed.reduce((s, l) => s + l.lineTax, 0));
  const totalIncTax = round2(subtotalExTax + totalTax);
  return { computed, subtotalExTax, totalTax, totalIncTax };
}

async function allocateInvoiceNumber(db: DbOrTx, ctx: InvoiceCommandContext) {
  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
    .limit(1);
  const prefix = profile?.invoicePrefix ?? "INV-";
  const seq = profile?.nextInvoiceNumber ?? 1;
  if (profile) {
    await db
      .update(tmBusinessProfiles)
      .set({ nextInvoiceNumber: seq + 1, updatedAt: new Date(), updatedBy: ctx.userId })
      .where(eq(tmBusinessProfiles.id, profile.id));
  }
  return {
    invoiceNumber: `${prefix}${String(seq).padStart(4, "0")}`,
    gstRegistered: profile?.gstRegistered ?? true,
    abn: profile?.abn ?? null,
  };
}

export async function createInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: CreateInvoiceInputType
) {
  const { invoiceNumber, gstRegistered, abn } = await allocateInvoiceNumber(db, ctx);
  const { computed, subtotalExTax, totalTax, totalIncTax } = computeInvoiceLines(input.lines, gstRegistered);
  const [customer] = await db
    .select()
    .from(tmCustomers)
    .where(eq(tmCustomers.id, input.customerId))
    .limit(1);

  const compliance = evaluateTaxInvoiceCompliance({
    gstRegistered,
    supplierAbn: abn,
    totalIncTax,
    buyerName: customer?.companyName ?? customer?.name,
    buyerAbn: customer?.abn,
  });

  const now = new Date();
  const invoiceId = crypto.randomUUID();
  const [created] = await db
    .insert(tmInvoices)
    .values({
      id: invoiceId,
      invoiceNumber,
      invoiceType: input.invoiceType,
      status: "DRAFT",
      customerId: input.customerId,
      siteId: input.siteId ?? null,
      jobId: input.jobId ?? null,
      quoteId: input.quoteId ?? null,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      gstRegisteredSnapshot: gstRegistered,
      documentTitle: compliance.documentTitle,
      subtotalExTax: subtotalExTax.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalIncTax: totalIncTax.toFixed(2),
      balanceDue: totalIncTax.toFixed(2),
      allowCardPayment: input.allowCardPayment,
      maxCardAmountOverride: input.maxCardAmountOverride?.toFixed(2) ?? null,
      chasingEnabled: input.chasingEnabled,
      chasingScheduleDaysJson: input.chasingScheduleDaysJson,
      notes: input.notes ?? compliance.complianceNote,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  await db.insert(tmInvoiceLines).values(
    computed.map((l) => ({
      id: crypto.randomUUID(),
      invoiceId,
      sourceType: l.sourceType,
      sourceId: l.sourceId ?? null,
      pricebookItemId: l.pricebookItemId ?? null,
      description: l.description,
      quantity: l.quantity.toFixed(2),
      unitCostExTax: l.unitCostExTax.toFixed(2),
      unitSellPrice: l.unitSellPrice.toFixed(2),
      taxCode: gstRegistered ? l.taxCode : "GST_FREE",
      lineTotalExTax: l.lineTotalExTax.toFixed(2),
      lineTax: l.lineTax.toFixed(2),
      lineTotalIncTax: l.lineTotalIncTax.toFixed(2),
      sortOrder: l.sortOrder,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    }))
  );
  return created;
}

export async function updateInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: UpdateInvoiceInputType
) {
  const [existing] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, input.id), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!existing) throw new Error("Invoice not found.");
  if (existing.lockedAt !== null || existing.status !== "DRAFT") {
    throw new Error("Locked or issued invoices cannot be edited. Issue a Credit Note instead.");
  }

  const { computed, subtotalExTax, totalTax, totalIncTax } = computeInvoiceLines(
    input.lines,
    existing.gstRegisteredSnapshot
  );
  const now = new Date();
  await db
    .update(tmInvoiceLines)
    .set({ archivedAt: now, archivedBy: ctx.userId })
    .where(and(eq(tmInvoiceLines.invoiceId, input.id), isNull(tmInvoiceLines.archivedAt)));

  await db.insert(tmInvoiceLines).values(
    computed.map((l) => ({
      id: crypto.randomUUID(),
      invoiceId: input.id,
      sourceType: l.sourceType,
      sourceId: l.sourceId ?? null,
      pricebookItemId: l.pricebookItemId ?? null,
      description: l.description,
      quantity: l.quantity.toFixed(2),
      unitCostExTax: l.unitCostExTax.toFixed(2),
      unitSellPrice: l.unitSellPrice.toFixed(2),
      taxCode: existing.gstRegisteredSnapshot ? l.taxCode : "GST_FREE",
      lineTotalExTax: l.lineTotalExTax.toFixed(2),
      lineTax: l.lineTax.toFixed(2),
      lineTotalIncTax: l.lineTotalIncTax.toFixed(2),
      sortOrder: l.sortOrder,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    }))
  );

  const [updated] = await db
    .update(tmInvoices)
    .set({
      invoiceType: input.invoiceType,
      customerId: input.customerId,
      siteId: input.siteId ?? null,
      jobId: input.jobId ?? null,
      issueDate: input.issueDate,
      dueDate: input.dueDate,
      subtotalExTax: subtotalExTax.toFixed(2),
      totalTax: totalTax.toFixed(2),
      totalIncTax: totalIncTax.toFixed(2),
      balanceDue: totalIncTax.toFixed(2),
      allowCardPayment: input.allowCardPayment,
      maxCardAmountOverride: input.maxCardAmountOverride?.toFixed(2) ?? null,
      chasingEnabled: input.chasingEnabled,
      chasingScheduleDaysJson: input.chasingScheduleDaysJson,
      notes: input.notes ?? null,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmInvoices.id, input.id))
    .returning();
  return updated;
}

export async function sendInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  invoiceId: string
) {
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice not found.");

  const [customer] = await db
    .select()
    .from(tmCustomers)
    .where(eq(tmCustomers.id, invoice.customerId))
    .limit(1);
  const [profile] = await db
    .select({ abn: tmBusinessProfiles.abn })
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
    .limit(1);

  const compliance = evaluateTaxInvoiceCompliance({
    gstRegistered: invoice.gstRegisteredSnapshot,
    supplierAbn: profile?.abn,
    totalIncTax: Number(invoice.totalIncTax),
    buyerName: customer?.companyName ?? customer?.name,
    buyerAbn: customer?.abn,
  });
  if (!compliance.valid) {
    throw new Error(compliance.errors.join(" "));
  }

  const lines = await db
    .select()
    .from(tmInvoiceLines)
    .where(and(eq(tmInvoiceLines.invoiceId, invoiceId), isNull(tmInvoiceLines.archivedAt)));

  await renderInvoicePdf(db, {
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    userId: ctx.userId,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    documentTitle: invoice.documentTitle,
    customerName: customer?.name ?? "Customer",
    abn: profile?.abn ?? null,
    gstRegistered: invoice.gstRegisteredSnapshot,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    subtotalExTax: invoice.subtotalExTax,
    totalTax: invoice.totalTax,
    totalIncTax: invoice.totalIncTax,
    balanceDue: invoice.balanceDue,
    lines,
  });

  const { rawToken, tokenHash } = await generatePortalToken();
  const now = new Date();
  const [updated] = await db
    .update(tmInvoices)
    .set({
      status: invoice.status === "DRAFT" ? "SENT" : invoice.status,
      lockedAt: invoice.lockedAt ?? now,
      portalTokenHash: tokenHash,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmInvoices.id, invoiceId))
    .returning();

  const targetEmail = customer?.email ?? null;
  const appConfig = resolveAppConfigOrDefault(ctx.appId);
  const portalUrl = `${appConfig.branding.appUrl}/i/${rawToken}`;
  const subject = `${invoice.documentTitle} ${invoice.invoiceNumber}`;
  let commStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED";

  if (targetEmail) {
    try {
      const result = await sendEmail({
        to: targetEmail,
        subject,
        html: `<p>Hi ${customer?.name ?? "there"},</p><p>Your ${invoice.documentTitle.toLowerCase()} <strong>${invoice.invoiceNumber}</strong> with balance due <strong>$${invoice.balanceDue}</strong> is ready.</p><p><a href="${portalUrl}">View &amp; Pay Invoice</a></p>`,
        text: `Hi ${customer?.name ?? "there"},\n\nYour ${invoice.documentTitle.toLowerCase()} ${invoice.invoiceNumber} with balance due $${invoice.balanceDue} is ready.\n\nView & pay here: ${portalUrl}`,
        appId: ctx.appId,
      });
      commStatus = result.success ? "SENT" : "FAILED";
    } catch {
      commStatus = "FAILED";
    }
  }

  await db.insert(tmCommLogs).values({
    id: crypto.randomUUID(),
    entityType: "INVOICE",
    entityId: invoiceId,
    channel: "EMAIL",
    direction: "OUTBOUND",
    recipient: targetEmail,
    subject,
    bodyPreview: `Balance due: ${invoice.balanceDue}`,
    status: commStatus,
    sentAt: commStatus === "SENT" ? now : undefined,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    createdAt: now,
    createdBy: ctx.userId,
    updatedAt: now,
    updatedBy: ctx.userId,
  });

  return { invoice: updated, rawToken };
}

export async function disputeInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  invoiceId: string,
  disputedReason: string
) {
  const now = new Date();
  const [updated] = await db
    .update(tmInvoices)
    .set({
      status: "DISPUTED",
      disputedReason,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(and(eq(tmInvoices.id, invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .returning();
  if (!updated) throw new Error("Invoice not found.");
  return updated;
}

export async function voidInvoiceCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  invoiceId: string
) {
  const [existing] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!existing) throw new Error("Invoice not found.");
  if (Number(existing.amountPaid) > 0) {
    throw new Error("Cannot void an invoice with recorded payments. Refund or issue a Credit Note.");
  }
  const now = new Date();
  const [updated] = await db
    .update(tmInvoices)
    .set({
      status: "VOID",
      balanceDue: "0.00",
      lockedAt: existing.lockedAt ?? now,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmInvoices.id, invoiceId))
    .returning();
  return updated;
}
