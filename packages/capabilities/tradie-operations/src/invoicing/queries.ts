import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { hashPortalToken } from "@kaesava/core";
import {
  tenants,
  tmBusinessProfiles,
  tmCreditNotes,
  tmInvoiceLines,
  tmInvoicePayments,
  tmInvoiceRefunds,
  tmInvoices,
  tmMaterialUsages,
  tmTimeEntries,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { resolveAllowedPaymentMethods } from "./stripe-connect.js";

export interface ActivityHistoryRow {
  id: string;
  kind: "PAYMENT" | "DEPOSIT" | "CREDIT_NOTE" | "REFUND" | "MATERIAL_COST" | "LABOUR_COST";
  title: string;
  subtitle: string | null;
  amount: string;
  occurredAt: string;
  entityId: string;
}

export async function listInvoicesQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  status?: string
) {
  const filters = [
    eq(tmInvoices.tenantId, tenantId),
    eq(tmInvoices.appId, appId),
    isNull(tmInvoices.archivedAt),
  ];
  if (status) filters.push(eq(tmInvoices.status, status));
  return db.select().from(tmInvoices).where(and(...filters)).orderBy(desc(tmInvoices.createdAt));
}

export async function getInvoiceByIdQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  invoiceId: string
) {
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, invoiceId), eq(tmInvoices.tenantId, tenantId), eq(tmInvoices.appId, appId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) return null;

  const [lines, payments, creditNotes, refunds] = await Promise.all([
    db.select().from(tmInvoiceLines).where(and(eq(tmInvoiceLines.invoiceId, invoiceId), isNull(tmInvoiceLines.archivedAt))).orderBy(tmInvoiceLines.sortOrder),
    db.select().from(tmInvoicePayments).where(and(eq(tmInvoicePayments.invoiceId, invoiceId), isNull(tmInvoicePayments.archivedAt))).orderBy(desc(tmInvoicePayments.paymentDate)),
    db.select().from(tmCreditNotes).where(and(eq(tmCreditNotes.invoiceId, invoiceId), isNull(tmCreditNotes.archivedAt))).orderBy(desc(tmCreditNotes.issuedAt)),
    db.select().from(tmInvoiceRefunds).where(and(eq(tmInvoiceRefunds.invoiceId, invoiceId), isNull(tmInvoiceRefunds.archivedAt))).orderBy(desc(tmInvoiceRefunds.refundedAt)),
  ]);

  return { invoice, lines, payments, creditNotes, refunds };
}

export async function getInvoiceByPortalTokenQuery(db: DbOrTx, rawToken: string) {
  const tokenHash = await hashPortalToken(rawToken);
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.portalTokenHash, tokenHash), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice portal link is invalid or expired.");

  if (invoice.status === "SENT") {
    await db
      .update(tmInvoices)
      .set({ status: "VIEWED", updatedAt: new Date() })
      .where(eq(tmInvoices.id, invoice.id));
  }

  const [lines, profileRows, tenantRows] = await Promise.all([
    db.select().from(tmInvoiceLines).where(and(eq(tmInvoiceLines.invoiceId, invoice.id), isNull(tmInvoiceLines.archivedAt))).orderBy(tmInvoiceLines.sortOrder),
    db.select().from(tmBusinessProfiles).where(and(eq(tmBusinessProfiles.tenantId, invoice.tenantId), eq(tmBusinessProfiles.appId, invoice.appId))).limit(1),
    db.select({ name: tenants.name }).from(tenants).where(eq(tenants.id, invoice.tenantId)).limit(1),
  ]);
  const profile = profileRows[0];

  const paymentMethods = resolveAllowedPaymentMethods({
    allowCardPayment: invoice.allowCardPayment,
    balanceDue: Number(invoice.balanceDue),
    maxCardAmountOverride: invoice.maxCardAmountOverride,
    defaultMaxCardAmount: profile?.defaultMaxCardAmount ?? null,
    payToEnabled: profile?.payToEnabled ?? false,
  });

  return {
    invoice: invoice.status === "SENT" ? { ...invoice, status: "VIEWED" as const } : invoice,
    lines,
    paymentMethods,
    stripeChargesEnabled: profile?.stripeChargesEnabled ?? false,
    payToEnabled: profile?.payToEnabled ?? false,
    allowCardPayment: invoice.allowCardPayment,
    maxCardAmount: invoice.maxCardAmountOverride ?? profile?.defaultMaxCardAmount ?? null,
    businessName: tenantRows[0]?.name ?? "Tradie Matters",
    abn: profile?.abn ?? null,
    payIdType: profile?.payIdType ?? null,
    payIdValue: profile?.payIdValue ?? null,
    bankAccountName: profile?.bankAccountName ?? null,
    bankBsb: profile?.bankBsb ?? null,
    bankAccountNumber: profile?.bankAccountNumber ?? null,
  };
}

export async function findInvoicesDueForChasingQuery(db: DbOrTx, _asOfDate?: string) {
  return db
    .select()
    .from(tmInvoices)
    .where(
      and(
        eq(tmInvoices.chasingEnabled, true),
        inArray(tmInvoices.status, ["SENT", "VIEWED", "PARTIALLY_PAID", "OVERDUE"]),
        isNull(tmInvoices.archivedAt)
      )
    );
}

export async function listFinancialActivityQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  jobId?: string
): Promise<ActivityHistoryRow[]> {
  const [payments, credits, refunds, materials, timeEntries] = await Promise.all([
    db.select().from(tmInvoicePayments).where(and(eq(tmInvoicePayments.tenantId, tenantId), eq(tmInvoicePayments.appId, appId), isNull(tmInvoicePayments.archivedAt))),
    db.select().from(tmCreditNotes).where(and(eq(tmCreditNotes.tenantId, tenantId), eq(tmCreditNotes.appId, appId), isNull(tmCreditNotes.archivedAt))),
    db.select().from(tmInvoiceRefunds).where(and(eq(tmInvoiceRefunds.tenantId, tenantId), eq(tmInvoiceRefunds.appId, appId), isNull(tmInvoiceRefunds.archivedAt))),
    db.select().from(tmMaterialUsages).where(and(eq(tmMaterialUsages.tenantId, tenantId), eq(tmMaterialUsages.appId, appId), ...(jobId ? [eq(tmMaterialUsages.jobId, jobId)] : []), isNull(tmMaterialUsages.archivedAt))),
    db.select().from(tmTimeEntries).where(and(eq(tmTimeEntries.tenantId, tenantId), eq(tmTimeEntries.appId, appId), ...(jobId ? [eq(tmTimeEntries.jobId, jobId)] : []), isNull(tmTimeEntries.archivedAt))),
  ]);

  const rows: ActivityHistoryRow[] = [
    ...payments.map((p) => ({
      id: p.id,
      kind: (p.paymentMethod === "CUSTOMER_CREDIT" ? "PAYMENT" : "PAYMENT") as ActivityHistoryRow["kind"],
      title: `Payment (${p.paymentMethod})`,
      subtitle: p.reference ?? p.notes,
      amount: p.amount,
      occurredAt: p.paymentDate.toISOString(),
      entityId: p.invoiceId,
    })),
    ...credits.map((c) => ({
      id: c.id,
      kind: "CREDIT_NOTE" as const,
      title: `Credit Note ${c.creditNoteNumber}`,
      subtitle: c.reason,
      amount: `-${c.totalIncTax}`,
      occurredAt: c.issuedAt.toISOString(),
      entityId: c.invoiceId,
    })),
    ...refunds.map((r) => ({
      id: r.id,
      kind: "REFUND" as const,
      title: `Refund (${r.refundMethod})`,
      subtitle: r.reason,
      amount: `-${r.amount}`,
      occurredAt: r.refundedAt.toISOString(),
      entityId: r.invoiceId,
    })),
    ...materials.map((m) => ({
      id: m.id,
      kind: "MATERIAL_COST" as const,
      title: m.description,
      subtitle: `Qty ${m.quantity}`,
      amount: (Number(m.quantity) * Number(m.unitCostSnapshot)).toFixed(2),
      occurredAt: m.createdAt.toISOString(),
      entityId: m.jobId,
    })),
    ...timeEntries.map((t) => ({
      id: t.id,
      kind: "LABOUR_COST" as const,
      title: t.notes ?? "Crew labour",
      subtitle: `${t.durationMinutes} mins`,
      amount: ((t.durationMinutes / 60) * Number(t.hourlyCostSnapshot)).toFixed(2),
      occurredAt: t.startedAt.toISOString(),
      entityId: t.jobId,
    })),
  ];

  return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}
