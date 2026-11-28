import { and, eq, isNull } from "drizzle-orm";
import {
  tmCreditNotes,
  tmInvoicePayments,
  tmInvoiceRefunds,
  tmInvoices,
  tmTimeEntries,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";

function csvCell(val: unknown): string {
  const str = String(val ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  return [headers.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}

export async function buildAccountantExportPackQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string
): Promise<Record<string, string>> {
  const [invoices, payments, credits, refunds, timeEntries] = await Promise.all([
    db.select().from(tmInvoices).where(and(eq(tmInvoices.tenantId, tenantId), eq(tmInvoices.appId, appId), isNull(tmInvoices.archivedAt))),
    db.select().from(tmInvoicePayments).where(and(eq(tmInvoicePayments.tenantId, tenantId), eq(tmInvoicePayments.appId, appId), isNull(tmInvoicePayments.archivedAt))),
    db.select().from(tmCreditNotes).where(and(eq(tmCreditNotes.tenantId, tenantId), eq(tmCreditNotes.appId, appId), isNull(tmCreditNotes.archivedAt))),
    db.select().from(tmInvoiceRefunds).where(and(eq(tmInvoiceRefunds.tenantId, tenantId), eq(tmInvoiceRefunds.appId, appId), isNull(tmInvoiceRefunds.archivedAt))),
    db.select().from(tmTimeEntries).where(and(eq(tmTimeEntries.tenantId, tenantId), eq(tmTimeEntries.appId, appId), isNull(tmTimeEntries.archivedAt))),
  ]);

  const totalSalesIncGst = invoices
    .filter((i) => i.status !== "VOID")
    .reduce((s, i) => s + Number(i.totalIncTax), 0);
  const totalGstCollected = invoices
    .filter((i) => i.status !== "VOID")
    .reduce((s, i) => s + Number(i.totalTax), 0);
  const totalCreditGst = credits.reduce((s, c) => s + Number(c.taxAmount), 0);

  return {
    "Tax_Invoices.csv": toCsv(
      ["InvoiceNumber", "Type", "Status", "IssueDate", "DueDate", "SubtotalExTax", "TotalTax", "TotalIncTax", "AmountPaid", "BalanceDue"],
      invoices.map((i) => [i.invoiceNumber, i.invoiceType, i.status, i.issueDate, i.dueDate, i.subtotalExTax, i.totalTax, i.totalIncTax, i.amountPaid, i.balanceDue])
    ),
    "Payments.csv": toCsv(
      ["PaymentId", "InvoiceId", "Amount", "Method", "PaymentDate", "Reference", "RefundedAmount"],
      payments.map((p) => [p.id, p.invoiceId, p.amount, p.paymentMethod, p.paymentDate.toISOString(), p.reference, p.refundedAmount])
    ),
    "Credit_Notes.csv": toCsv(
      ["CreditNoteNumber", "InvoiceId", "Reason", "AmountExTax", "TaxAmount", "TotalIncTax", "Destination", "IssuedAt"],
      credits.map((c) => [c.creditNoteNumber, c.invoiceId, c.reason, c.amountExTax, c.taxAmount, c.totalIncTax, c.creditDestination, c.issuedAt.toISOString()])
    ),
    "Refunds.csv": toCsv(
      ["RefundId", "InvoiceId", "PaymentId", "Amount", "Method", "Reason", "RefundedAt"],
      refunds.map((r) => [r.id, r.invoiceId, r.paymentId, r.amount, r.refundMethod, r.reason, r.refundedAt.toISOString()])
    ),
    "GST_BAS_Summary.csv": toCsv(
      ["Metric", "Amount"],
      [
        ["G1_Total_Sales_Inc_GST", totalSalesIncGst.toFixed(2)],
        ["1A_GST_On_Sales", totalGstCollected.toFixed(2)],
        ["Credit_Note_GST_Adjustment", totalCreditGst.toFixed(2)],
        ["Net_GST_Payable", (totalGstCollected - totalCreditGst).toFixed(2)],
      ]
    ),
    "Approved_Timesheets.csv": toCsv(
      ["EntryId", "JobId", "UserId", "StartedAt", "DurationMinutes", "IsBillable", "HourlyCost", "HourlyCharge"],
      timeEntries.map((t) => [t.id, t.jobId, t.userId, t.startedAt.toISOString(), t.durationMinutes, t.isBillable, t.hourlyCostSnapshot, t.hourlyChargeSnapshot])
    ),
  };
}
