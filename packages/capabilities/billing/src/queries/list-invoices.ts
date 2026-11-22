/**
 * Queries billing invoice history for a tenant scope.
 */
import { and, desc, eq } from "drizzle-orm";
import { billingInvoices, type DbOrTx } from "@money-matters/db/rings/capabilities";
import type { BillingInvoiceDto } from "@money-matters/types";

export async function listInvoicesQuery(
  db: DbOrTx,
  tenantId: string,
  appId?: string
): Promise<BillingInvoiceDto[]> {
  const whereClause = appId
    ? and(eq(billingInvoices.tenantId, tenantId), eq(billingInvoices.appId, appId))
    : eq(billingInvoices.tenantId, tenantId);
  const records = await db
    .select()
    .from(billingInvoices)
    .where(whereClause)
    .orderBy(desc(billingInvoices.createdAt));

  return records.map((inv) => ({
    id: inv.id,
    tenantId: inv.tenantId ?? tenantId,
    stripeInvoiceId: inv.stripeInvoiceId,
    amountPaid: inv.amountPaid,
    currency: inv.currency,
    status: inv.status,
    paidAt: inv.paidAt,
    periodStart: inv.periodStart,
    periodEnd: inv.periodEnd,
    invoicePdfUrl: inv.invoicePdfUrl,
    hostedInvoiceUrl: inv.hostedInvoiceUrl,
    createdAt: inv.createdAt,
  }));
}
