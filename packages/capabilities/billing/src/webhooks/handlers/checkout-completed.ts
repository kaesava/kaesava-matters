import Stripe from "stripe";
import { type DbOrTx } from "@kaesava/db/rings/capabilities";
import { PlanKeySchema, type PlanKey } from "@kaesava/types";
import { activateSubscriptionCommand } from "../../commands/activate-subscription.js";
import { resolveTenantId } from "./resolve-tenant.js";

export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  db: DbOrTx
): Promise<void> {
  const rawTenantId = session.client_reference_id || (session.metadata && session.metadata.tenantId);
  const planTypeResult = PlanKeySchema.safeParse(session.metadata?.planType);
  const planType: PlanKey = planTypeResult.success ? planTypeResult.data : "annual";

  if (session.subscription && session.customer) {
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id || "";
    const tenantId = await resolveTenantId(db, rawTenantId, customerId, subscriptionId);

    if (tenantId) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const priceId = sub.items.data[0]?.price.id || "";
      const currentPeriodEnd = sub.current_period_end
        ? new Date(sub.current_period_end * 1000)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await activateSubscriptionCommand(db, {
        tenantId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        stripePriceId: priceId,
        subscriptionEndsAt: currentPeriodEnd,
        planType,
      });
    }
  }
}
