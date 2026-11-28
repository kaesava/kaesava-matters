import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import { hashPortalToken } from "@kaesava/core";
import { tenantUsers as tenantMembers } from "@kaesava/db/rings/platform";
import {
  processedWebhooks,
  tmBusinessProfiles,
  tmInvoices,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { recordInvoicePaymentCommand } from "./payments-credits.js";

export async function createStripeConnectAccountLinkCommand(
  db: DbOrTx,
  params: {
    tenantId: string;
    appId: string;
    userId: string;
    stripeSecretKey: string;
    refreshUrl: string;
    returnUrl: string;
  }
) {
  const stripe = new Stripe(params.stripeSecretKey);
  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, params.tenantId), eq(tmBusinessProfiles.appId, params.appId)))
    .limit(1);

  let accountId = profile?.stripeAccountId ?? null;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "standard",
      country: "AU",
      capabilities: {
        payto_payments: { requested: true },
        card_payments: { requested: true },
        transfers: { requested: true },
      } as unknown as Stripe.AccountCreateParams["capabilities"],
    });
    accountId = account.id;
    if (profile) {
      await db
        .update(tmBusinessProfiles)
        .set({ stripeAccountId: accountId, updatedAt: new Date(), updatedBy: params.userId })
        .where(eq(tmBusinessProfiles.id, profile.id));
    }
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: params.refreshUrl,
    return_url: params.returnUrl,
    type: "account_onboarding",
  });

  return { stripeAccountId: accountId, url: link.url };
}

export function resolveAllowedPaymentMethods(params: {
  allowCardPayment: boolean;
  balanceDue: number;
  maxCardAmountOverride: string | null;
  defaultMaxCardAmount: string | null;
  payToPaymentsFlag?: boolean;
  payToEnabled?: boolean;
}): Array<"payto" | "au_becs_debit" | "card"> {
  const usePayTo = Boolean(params.payToPaymentsFlag && params.payToEnabled);
  const methods: Array<"payto" | "au_becs_debit" | "card"> = usePayTo
    ? ["payto"]
    : ["au_becs_debit"];
  if (!params.allowCardPayment) return methods;
  const cap = params.maxCardAmountOverride ?? params.defaultMaxCardAmount;
  if (cap !== null && params.balanceDue > Number(cap)) {
    return methods;
  }
  methods.push("card");
  return methods;
}

export async function createDirectChargeCheckoutCommand(
  db: DbOrTx,
  params: {
    rawToken: string;
    stripeSecretKey: string;
    successUrl: string;
    cancelUrl: string;
  }
) {
  const tokenHash = await hashPortalToken(params.rawToken);
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.portalTokenHash, tokenHash), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice portal link is invalid or expired.");

  const balanceDue = Number(invoice.balanceDue);
  if (balanceDue <= 0) throw new Error("Invoice has no remaining balance due.");

  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, invoice.tenantId), eq(tmBusinessProfiles.appId, invoice.appId)))
    .limit(1);
  if (!profile?.stripeAccountId || !profile.stripeChargesEnabled) {
    throw new Error("Online payments are not enabled for this business.");
  }

  const paymentMethods = resolveAllowedPaymentMethods({
    allowCardPayment: invoice.allowCardPayment,
    balanceDue,
    maxCardAmountOverride: invoice.maxCardAmountOverride,
    defaultMaxCardAmount: profile.defaultMaxCardAmount,
  });

  const stripe = new Stripe(params.stripeSecretKey);
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: paymentMethods as unknown as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: Math.round(balanceDue * 100),
            product_data: {
              name: `${invoice.documentTitle} ${invoice.invoiceNumber}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice.id,
        tenantId: invoice.tenantId,
        appId: invoice.appId,
      },
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
    },
    { stripeAccount: profile.stripeAccountId }
  );

  return { sessionId: session.id, checkoutUrl: session.url, paymentMethods };
}

export async function handleStripeConnectWebhook(
  db: DbOrTx,
  params: {
    rawBody: string;
    signature: string;
    stripeSecretKey: string;
    webhookSecret: string;
  }
): Promise<{ received: boolean; eventType: string }> {
  const stripe = new Stripe(params.stripeSecretKey);
  const event = await stripe.webhooks.constructEventAsync(
    params.rawBody,
    params.signature,
    params.webhookSecret
  );

  const [already] = await db
    .select({ eventId: processedWebhooks.eventId })
    .from(processedWebhooks)
    .where(eq(processedWebhooks.eventId, event.id))
    .limit(1);
  if (already) return { received: true, eventType: event.type };

  await db.insert(processedWebhooks).values({ eventId: event.id });

  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    await db
      .update(tmBusinessProfiles)
      .set({
        stripeChargesEnabled: Boolean(account.charges_enabled),
        payToEnabled: (account.capabilities as Record<string, unknown> | undefined)?.payto_payments === "active",
        updatedAt: new Date(),
      })
      .where(eq(tmBusinessProfiles.stripeAccountId, account.id));
  } else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;
    const tenantId = session.metadata?.tenantId;
    const appId = session.metadata?.appId;
    if (invoiceId && tenantId && appId && session.amount_total) {
      const [ownerMember] = await db
        .select({ userId: tenantMembers.userId })
        .from(tenantMembers)
        .where(and(eq(tenantMembers.tenantId, tenantId), eq(tenantMembers.role, "OWNER")))
        .limit(1);
      const actorUserId = ownerMember?.userId ?? tenantId;
      const paymentMethod = session.payment_method_types?.includes("payto") &&
        !session.payment_method_types?.includes("card")
        ? "STRIPE_PAYTO"
        : session.payment_method_types?.includes("au_becs_debit") &&
          !session.payment_method_types?.includes("card")
          ? "STRIPE_BECS"
          : "STRIPE_CARD";
      await recordInvoicePaymentCommand(
        db,
        { tenantId, appId, userId: actorUserId },
        {
          invoiceId,
          amount: session.amount_total / 100,
          paymentMethod,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          reference: session.id,
        }
      );
    }
  }

  return { received: true, eventType: event.type };
}
