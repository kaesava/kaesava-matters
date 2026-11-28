import { and, eq, isNotNull, isNull } from "drizzle-orm";
import {
  tmCreditNotes,
  tmCustomers,
  tmInvoicePayments,
  tmInvoiceRefunds,
  tmInvoices,
  tmJobs,
  tmPricebookItems,
  tmQuotes,
  tmSites,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { ArchivedRecordItem } from "@kaesava/types";
import { buildAccountantExportPackQuery } from "../pulse/export-pack.js";

export async function listTradieArchivedItems(
  db: DbOrTx,
  tenantId: string,
  appId: string
): Promise<ArchivedRecordItem[]> {
  const [customers, sites, pricebook, jobs, quotes] = await Promise.all([
    db
      .select({ id: tmCustomers.id, name: tmCustomers.name, subtitle: tmCustomers.companyName, archivedAt: tmCustomers.archivedAt })
      .from(tmCustomers)
      .where(and(eq(tmCustomers.tenantId, tenantId), eq(tmCustomers.appId, appId), isNotNull(tmCustomers.archivedAt))),
    db
      .select({ id: tmSites.id, name: tmSites.name, subtitle: tmSites.addressLine1, archivedAt: tmSites.archivedAt })
      .from(tmSites)
      .where(and(eq(tmSites.tenantId, tenantId), eq(tmSites.appId, appId), isNotNull(tmSites.archivedAt))),
    db
      .select({ id: tmPricebookItems.id, name: tmPricebookItems.name, subtitle: tmPricebookItems.sku, archivedAt: tmPricebookItems.archivedAt })
      .from(tmPricebookItems)
      .where(and(eq(tmPricebookItems.tenantId, tenantId), eq(tmPricebookItems.appId, appId), isNotNull(tmPricebookItems.archivedAt))),
    db
      .select({ id: tmJobs.id, name: tmJobs.title, subtitle: tmJobs.jobNumber, archivedAt: tmJobs.archivedAt })
      .from(tmJobs)
      .where(and(eq(tmJobs.tenantId, tenantId), eq(tmJobs.appId, appId), isNotNull(tmJobs.archivedAt))),
    db
      .select({ id: tmQuotes.id, name: tmQuotes.title, subtitle: tmQuotes.quoteNumber, archivedAt: tmQuotes.archivedAt })
      .from(tmQuotes)
      .where(and(eq(tmQuotes.tenantId, tenantId), eq(tmQuotes.appId, appId), isNotNull(tmQuotes.archivedAt))),
  ]);

  return [
    ...customers.map((c) => ({ ...c, itemType: "CUSTOMER" })),
    ...sites.map((s) => ({ ...s, itemType: "SITE" })),
    ...pricebook.map((p) => ({ ...p, itemType: "PRICEBOOK_ITEM" })),
    ...jobs.map((j) => ({ ...j, itemType: "JOB" })),
    ...quotes.map((q) => ({ ...q, itemType: "QUOTE" })),
  ];
}

export async function restoreTradieArchivedItem(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string,
  itemId: string,
  itemType?: string
) {
  const now = new Date();
  const patch = { archivedAt: null, archivedBy: null, updatedAt: now, updatedBy: userId };
  const tables = [
    { key: "CUSTOMER", table: tmCustomers },
    { key: "SITE", table: tmSites },
    { key: "PRICEBOOK_ITEM", table: tmPricebookItems },
    { key: "JOB", table: tmJobs },
    { key: "QUOTE", table: tmQuotes },
  ] as const;

  for (const entry of tables) {
    if (itemType && itemType !== entry.key) continue;
    const [restored] = await db
      .update(entry.table)
      .set(patch)
      .where(and(eq(entry.table.id, itemId), eq(entry.table.tenantId, tenantId), eq(entry.table.appId, appId)))
      .returning();
    if (restored) return restored;
  }
  return null;
}

export async function applyInvoiceLegalHoldOnTenantDelete(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  userId: string
): Promise<void> {
  const now = new Date();
  const holdUntil = new Date(now.getTime() + 5 * 365 * 86400000);
  await db
    .update(tmInvoices)
    .set({ legalHoldUntil: holdUntil, updatedAt: now, updatedBy: userId })
    .where(
      and(
        eq(tmInvoices.tenantId, tenantId),
        eq(tmInvoices.appId, appId),
        isNotNull(tmInvoices.lockedAt)
      )
    );
}

export async function exportTradieTenantData(
  db: DbOrTx,
  tenantId: string,
  appId: string
): Promise<Record<string, string>> {
  const [customers, sites, pricebook, jobs, quotes, invoices, payments, credits, refunds, csvPack] =
    await Promise.all([
      db.select().from(tmCustomers).where(and(eq(tmCustomers.tenantId, tenantId), eq(tmCustomers.appId, appId), isNull(tmCustomers.archivedAt))),
      db.select().from(tmSites).where(and(eq(tmSites.tenantId, tenantId), eq(tmSites.appId, appId), isNull(tmSites.archivedAt))),
      db.select().from(tmPricebookItems).where(and(eq(tmPricebookItems.tenantId, tenantId), eq(tmPricebookItems.appId, appId), isNull(tmPricebookItems.archivedAt))),
      db.select().from(tmJobs).where(and(eq(tmJobs.tenantId, tenantId), eq(tmJobs.appId, appId), isNull(tmJobs.archivedAt))),
      db.select().from(tmQuotes).where(and(eq(tmQuotes.tenantId, tenantId), eq(tmQuotes.appId, appId), isNull(tmQuotes.archivedAt))),
      db.select().from(tmInvoices).where(and(eq(tmInvoices.tenantId, tenantId), eq(tmInvoices.appId, appId), isNull(tmInvoices.archivedAt))),
      db.select().from(tmInvoicePayments).where(and(eq(tmInvoicePayments.tenantId, tenantId), eq(tmInvoicePayments.appId, appId), isNull(tmInvoicePayments.archivedAt))),
      db.select().from(tmCreditNotes).where(and(eq(tmCreditNotes.tenantId, tenantId), eq(tmCreditNotes.appId, appId), isNull(tmCreditNotes.archivedAt))),
      db.select().from(tmInvoiceRefunds).where(and(eq(tmInvoiceRefunds.tenantId, tenantId), eq(tmInvoiceRefunds.appId, appId), isNull(tmInvoiceRefunds.archivedAt))),
      buildAccountantExportPackQuery(db, tenantId, appId),
    ]);

  return {
    "tradie_customers.json": JSON.stringify(customers, null, 2),
    "tradie_sites.json": JSON.stringify(sites, null, 2),
    "tradie_pricebook.json": JSON.stringify(pricebook, null, 2),
    "tradie_jobs.json": JSON.stringify(jobs, null, 2),
    "tradie_quotes.json": JSON.stringify(quotes, null, 2),
    "tradie_invoices.json": JSON.stringify(invoices, null, 2),
    "tradie_invoice_payments.json": JSON.stringify(payments, null, 2),
    "tradie_credit_notes.json": JSON.stringify(credits, null, 2),
    "tradie_invoice_refunds.json": JSON.stringify(refunds, null, 2),
    ...csvPack,
  };
}
