/**
 * Creates a Stripe Customer Portal session link for managing billing.
 */
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@money-matters/db/rings/capabilities";
import { validateEnv, resolveAppConfigOrDefault } from "@money-matters/config";

async function resolveOrCreateStripeCustomerId(
  db: DbOrTx,
  stripe: Stripe,
  tenant: { id: string; appId?: string | null; name: string; stripeCustomerId: string | null },
  userEmail?: string
): Promise<string> {
  if (tenant.stripeCustomerId) {
    return tenant.stripeCustomerId;
  }

  const appConfig = resolveAppConfigOrDefault(tenant.appId);
  const customer = await stripe.customers.create({
    email: userEmail || appConfig.branding.supportEmail,
    name: tenant.name,
    metadata: {
      tenantId: tenant.id,
      ...(tenant.appId ? { appId: tenant.appId } : {}),
    },
  });
  const customerId = customer.id;

  await db
    .update(tenants)
    .set({ stripeCustomerId: customerId, updatedAt: new Date() })
    .where(eq(tenants.id, tenant.id));

  return customerId;
}

export async function createCustomerPortalSessionCommand(
  db: DbOrTx,
  tenantId: string,
  input: { returnUrl: string },
  userEmail?: string
): Promise<{ url: string }> {
  const env = validateEnv();
  const stripeSecretKey = env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key configuration is missing.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  const [tenant] = await db
    .select({
      id: tenants.id,
      appId: tenants.appId,
      name: tenants.name,
      stripeCustomerId: tenants.stripeCustomerId,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const customerId = await resolveOrCreateStripeCustomerId(db, stripe, tenant, userEmail);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: input.returnUrl,
  });

  return { url: session.url };
}
