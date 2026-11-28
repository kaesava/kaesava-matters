/**
 * Creates a Stripe Checkout Session for subscription or one-time payment checkout.
 * Resolves or creates Stripe Customer object for the tenant.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@kaesava/db/rings/capabilities";
import { validateEnv, resolveAppConfigOrDefault } from "@kaesava/config";
import { z } from "zod";
import { CreateCheckoutSessionCommand } from "@kaesava/types";

export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionCommand>;

function isWhitelistedUrl(target: string, appId?: string | null): boolean {
  if (!target) return false;
  const app = resolveAppConfigOrDefault(appId);
  if (target.startsWith(app.branding.deepLinkScheme)) return true;
  try {
    const host = new URL(target).hostname;
    return app.allowedRedirectHosts.some((h) => (h.startsWith(".") ? host.endsWith(h) : host === h));
  } catch {
    return false;
  }
}

function resolveTargetPriceId(input: CreateCheckoutSessionInput, appId?: string | null): string {
  const env = validateEnv();
  const app = resolveAppConfigOrDefault(appId);
  const appPriceIds = app.billing?.priceIds;
  let targetPriceId = input.packKey
    ? appPriceIds?.[input.packKey]
    : input.planType
      ? appPriceIds?.[input.planType]
      : undefined;

  if (!targetPriceId && input.planType === "founding") {
    targetPriceId = appPriceIds?.foundingAnnual || env.STRIPE_PRICE_FOUNDING_ANNUAL || process.env.STRIPE_PRICE_FOUNDING_ANNUAL;
  } else if (!targetPriceId && input.planType === "monthly") {
    targetPriceId = env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_MONTHLY;
  } else if (!targetPriceId && input.planType === "annual") {
    targetPriceId = env.STRIPE_PRICE_ANNUAL || process.env.STRIPE_PRICE_ANNUAL;
  }

  targetPriceId = targetPriceId || input.priceId || env.STRIPE_PRICE_ANNUAL || process.env.STRIPE_PRICE_ANNUAL || env.STRIPE_PRICE_MONTHLY || process.env.STRIPE_PRICE_MONTHLY;
  if (!targetPriceId) throw new Error("No valid Stripe Price ID configured for checkout.");
  return targetPriceId;
}

async function resolveOrCreateCustomer(
  stripe: Stripe,
  db: DbOrTx,
  tenant: { id: string; appId: string; name: string; stripeCustomerId: string | null },
  userEmail: string
): Promise<string> {
  if (tenant.stripeCustomerId) return tenant.stripeCustomerId;
  const customer = await stripe.customers.create({
    email: userEmail,
    name: tenant.name,
    metadata: { tenantId: tenant.id, appId: tenant.appId },
  });
  await db.update(tenants).set({ stripeCustomerId: customer.id, updatedAt: new Date() }).where(eq(tenants.id, tenant.id));
  return customer.id;
}

export async function createCheckoutSessionCommand(
  db: DbOrTx,
  tenantId: string,
  userEmail: string,
  input: CreateCheckoutSessionInput,
  appId?: string | null,
  userId?: string | null
): Promise<{ url: string }> {
  if (!isWhitelistedUrl(input.successUrl, appId) || !isWhitelistedUrl(input.cancelUrl, appId)) {
    throw new Error("Invalid redirect URL: target domain is not authorized.");
  }
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) throw new Error("Stripe secret key is not configured.");

  const [tenant] = await db
    .select({ id: tenants.id, appId: tenants.appId, name: tenants.name, stripeCustomerId: tenants.stripeCustomerId })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);
  if (!tenant) throw new Error(`Tenant not found: ${tenantId}`);
  if (!isWhitelistedUrl(input.successUrl, tenant.appId) || !isWhitelistedUrl(input.cancelUrl, tenant.appId)) {
    throw new Error("Invalid redirect URL: target domain is not authorized.");
  }

  const targetPriceId = resolveTargetPriceId(input, tenant.appId);
  const stripe = new Stripe(stripeSecretKey, { httpClient: Stripe.createFetchHttpClient() });
  const customerId = await resolveOrCreateCustomer(stripe, db, tenant, userEmail);
  const successUrl = input.successUrl.includes("{CHECKOUT_SESSION_ID}")
    ? input.successUrl
    : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`;
  const mode = input.purchaseMode ?? "subscription";
  const metadata = {
    tenantId,
    appId: tenant.appId,
    planType: input.planType || "annual",
    ...(userId ? { userId } : {}),
    ...(input.packKey ? { packKey: input.packKey } : {}),
  };

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode,
    line_items: [{ price: targetPriceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: tenantId,
    ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
    metadata,
  });
  if (!session.url) throw new Error("Failed to create Stripe checkout session URL.");
  return { url: session.url };
}
