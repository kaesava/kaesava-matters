/**
 * Stripe webhook processor.
 * Requires raw request body string for cryptographic signature verification.
 */
import Stripe from "stripe";
import { validateEnv } from "@kaesava/config";
import { type DbOrTx, processedWebhooks } from "@kaesava/db/rings/capabilities";
import { handleCheckoutSessionCompleted } from "./handlers/checkout-completed.js";
import { handleSubscriptionUpdated, handleSubscriptionDeleted } from "./handlers/subscription-updated.js";
import { handleInvoicePaymentSucceeded, handleInvoicePaymentFailed } from "./handlers/invoice-events.js";

export class StripeSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeSignatureError";
  }
}

export interface StripeWebhookOptions {
  expectedAppId?: string;
  onOneTimeCheckoutCompleted?: (session: Stripe.Checkout.Session, db: DbOrTx) => Promise<void>;
}

export async function handleStripeWebhook(
  rawBody: string,
  signature: string,
  webhookSecret: string,
  db: DbOrTx,
  stripeSecretKeyOverride?: string,
  options?: StripeWebhookOptions
): Promise<{ processed: boolean; eventType: string }> {
  let stripeSecretKey = stripeSecretKeyOverride || process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    try {
      const env = validateEnv();
      stripeSecretKey = env.STRIPE_SECRET_KEY;
    } catch {
      // Partial harness fallback
    }
  }
  if (!stripeSecretKey) {
    throw new Error("Stripe secret key is not configured.");
  }

  const stripe = new Stripe(stripeSecretKey, {
    httpClient: Stripe.createFetchHttpClient(),
  });

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new StripeSignatureError(`Stripe webhook signature verification failed: ${(err as Error).message}`);
  }

  if (!db) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const metadataAppId = (event.data.object as { metadata?: Record<string, string> })?.metadata?.appId;
  if (options?.expectedAppId && metadataAppId && metadataAppId !== options.expectedAppId) {
    return { processed: false, eventType: "ignored_other_app" };
  }

  // Claim-First Idempotency: Atomic claim
  const claimResult = await db
    .insert(processedWebhooks)
    .values({
      eventId: event.id,
      processedAt: new Date(),
    })
    .onConflictDoNothing()
    .returning({ eventId: processedWebhooks.eventId });

  if (claimResult.length === 0) {
    return { processed: true, eventType: `${event.type} (already_processed)` };
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "payment") {
        await options?.onOneTimeCheckoutCompleted?.(session, db);
      } else {
        await handleCheckoutSessionCompleted(session, stripe, db);
      }
      break;
    }

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db);
      break;

    case "invoice.payment_succeeded":
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, stripe, db);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, stripe, db);
      break;

    default:
      break;
  }

  return { processed: true, eventType: event.type };
}
