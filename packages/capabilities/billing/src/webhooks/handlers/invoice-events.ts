import Stripe from "stripe";
import { z } from "zod";
import { type DbOrTx, billingInvoices, tenants } from "@money-matters/db";
import { getCachedDateFormat, sendNotificationEmail, formatCurrency } from "@money-matters/core";
import { resolveAppConfigOrDefault } from "@money-matters/config";
import { eq } from "drizzle-orm";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE } from "@money-matters/types";
import { activateSubscriptionCommand } from "../../commands/activate-subscription.js";
import { deactivateTenantCommand } from "../../commands/deactivate-tenant.js";
import { resolveTenantId } from "./resolve-tenant.js";

export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  db: DbOrTx
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);
  if (!tenantId) return;

  const priceId = sub.items.data[0]?.price.id || "";
  const currentPeriodEnd = new Date(sub.current_period_end * 1000);
  const planTypeResult = z.enum(["monthly", "annual", "founding"]).safeParse(sub.metadata?.planType);
  const planType: "monthly" | "annual" | "founding" = planTypeResult.success ? planTypeResult.data : "annual";

  await activateSubscriptionCommand(db, {
    tenantId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionEndsAt: currentPeriodEnd,
    planType,
  });

  const [tenantRow] = await db.select({ appId: tenants.appId }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const resolvedAppId = tenantRow?.appId || sub.metadata?.appId || process.env["DEFAULT_APP_ID"] || "01908bde-34bb-7b19-a178-574211bc93aa";

  if (invoice.id) {
    await db
      .insert(billingInvoices)
      .values({
        tenantId,
        appId: resolvedAppId,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        amountPaid: ((invoice.amount_paid || 0) / 100).toFixed(2),
        currency: (invoice.currency || "aud").toUpperCase(),
        status: invoice.status || "paid",
        paidAt: invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : new Date(),
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        invoicePdfUrl: invoice.invoice_pdf || null,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      })
      .onConflictDoNothing();
  }

  const customerEmail =
    invoice.customer_email ||
    (invoice.customer !== null && typeof invoice.customer === "object" && !("deleted" in invoice.customer)
      ? (invoice.customer as Stripe.Customer).email
      : null);

  if (customerEmail) {
    const app = resolveAppConfigOrDefault(resolvedAppId);
    const currencyCode = (invoice.currency || "aud").toUpperCase();
    const formattedAmount = formatCurrency((invoice.amount_paid || 0) / 100, { currency: currencyCode });
    const formattedEndDate = getCachedDateFormat(DEFAULT_LOCALE, { dateStyle: "medium", timeZone: DEFAULT_TIMEZONE }).format(currentPeriodEnd);
    await sendNotificationEmail(
      customerEmail,
      `Your ${app.name} Subscription Receipt`,
      `Thank you for your payment of ${formattedAmount} for ${app.name} ${app.terminology.tenantSingular}.\n\nYour subscription is active until ${formattedEndDate}.\n\nYou can view and download your invoice receipt here:\n${invoice.hosted_invoice_url || `${app.branding.appUrl}/dashboard/settings?tab=subscription`}\n\nIf you have any questions, contact our support team at ${app.branding.supportEmail}.`,
      tenantRow?.appId
    ).catch(() => {});
  }
}

export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  db: DbOrTx
): Promise<void> {
  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
  if (!subscriptionId) return;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id || "";
  const tenantId = await resolveTenantId(db, sub.metadata?.tenantId, customerId, subscriptionId);
  if (!tenantId) return;

  const [tenantRow] = await db.select({ appId: tenants.appId }).from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  const resolvedAppId = tenantRow?.appId || sub.metadata?.appId || process.env["DEFAULT_APP_ID"] || "01908bde-34bb-7b19-a178-574211bc93aa";

  if (invoice.id) {
    await db
      .insert(billingInvoices)
      .values({
        tenantId,
        appId: resolvedAppId,
        stripeInvoiceId: invoice.id,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        amountPaid: "0.00",
        currency: (invoice.currency || "aud").toUpperCase(),
        status: "payment_failed",
        paidAt: null,
        periodStart: invoice.period_start ? new Date(invoice.period_start * 1000) : null,
        periodEnd: invoice.period_end ? new Date(invoice.period_end * 1000) : null,
        invoicePdfUrl: invoice.invoice_pdf || null,
        hostedInvoiceUrl: invoice.hosted_invoice_url || null,
      })
      .onConflictDoNothing();
  }

  await deactivateTenantCommand(db, tenantId, "GRACE_PERIOD");

  const customerEmail =
    invoice.customer_email ||
    (invoice.customer !== null && typeof invoice.customer === "object" && !("deleted" in invoice.customer)
      ? (invoice.customer as Stripe.Customer).email
      : null);

  if (customerEmail) {
    const app = resolveAppConfigOrDefault(resolvedAppId);
    await sendNotificationEmail(
      customerEmail,
      `⚠️ Payment Action Required — ${app.name} ${app.terminology.tenantSingular}`,
      `We were unable to process your recurring subscription payment for ${app.name} ${app.terminology.tenantSingular}.\n\nTo prevent interruption to your data access, please update your payment method via the customer portal:\n${app.branding.appUrl}/subscription/manage\n\nNeed assistance? Contact ${app.branding.supportEmail}.`,
      tenantRow?.appId
    ).catch(() => {});
  }
}
