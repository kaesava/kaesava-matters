import { beforeEach, describe, expect, it, vi } from "vitest";
import Stripe from "stripe";
import type { DbOrTx } from "@kaesava/db/rings/capabilities";
import { handleStripeWebhook, StripeSignatureError } from "./stripe-webhook-handler.js";
import { handleCheckoutSessionCompleted } from "./handlers/checkout-completed.js";
import {
  handleSubscriptionDeleted,
  handleSubscriptionUpdated,
} from "./handlers/subscription-updated.js";
import {
  handleInvoicePaymentFailed,
  handleInvoicePaymentSucceeded,
} from "./handlers/invoice-events.js";

vi.mock("./handlers/checkout-completed.js", () => ({
  handleCheckoutSessionCompleted: vi.fn(async () => undefined),
}));
vi.mock("./handlers/subscription-updated.js", () => ({
  handleSubscriptionUpdated: vi.fn(async () => undefined),
  handleSubscriptionDeleted: vi.fn(async () => undefined),
}));
vi.mock("./handlers/invoice-events.js", () => ({
  handleInvoicePaymentSucceeded: vi.fn(async () => undefined),
  handleInvoicePaymentFailed: vi.fn(async () => undefined),
}));

const TEST_SECRET = "whsec_test_secret_12345";
const TEST_API_KEY = "sk_test_1234567890";
const stripeClient = new Stripe(TEST_API_KEY);

function makeSignedEvent(
  type: string,
  dataObject: Record<string, unknown>,
  id = "evt_test_1"
): { rawBody: string; signature: string } {
  const payload = JSON.stringify({
    id,
    object: "event",
    api_version: "2025-02-24.acacia",
    created: Math.floor(Date.now() / 1000),
    type,
    data: { object: dataObject },
    livemode: false,
    pending_webhooks: 0,
    request: null,
  });
  const signature = stripeClient.webhooks.generateTestHeaderString({
    payload,
    secret: TEST_SECRET,
  });
  return { rawBody: payload, signature };
}

function makeMockDb(claimRows: Array<{ eventId: string }> = [{ eventId: "evt_test_1" }]): DbOrTx {
  const returning = vi.fn(async () => claimRows);
  const onConflictDoNothing = vi.fn(() => ({ returning }));
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));
  return { insert } as unknown as DbOrTx;
}

describe("handleStripeWebhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws when Stripe secret key is missing", async () => {
    const prevKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    try {
      const mockDb = makeMockDb();
      await expect(
        handleStripeWebhook("{}", "sig", TEST_SECRET, mockDb, "")
      ).rejects.toThrow("Stripe secret key is not configured.");
    } finally {
      if (prevKey !== undefined) process.env.STRIPE_SECRET_KEY = prevKey;
    }
  });

  it("throws StripeSignatureError when signature verification fails", async () => {
    const mockDb = makeMockDb();
    await expect(
      handleStripeWebhook('{"id":"evt_1"}', "t=123,v1=bad", TEST_SECRET, mockDb, TEST_API_KEY)
    ).rejects.toThrow(StripeSignatureError);
  });

  it("ignores events whose metadata.appId does not match options.expectedAppId", async () => {
    const { rawBody, signature } = makeSignedEvent("checkout.session.completed", {
      id: "cs_1",
      mode: "subscription",
      metadata: { appId: "other-app" },
    });
    const mockDb = makeMockDb();

    const res = await handleStripeWebhook(rawBody, signature, TEST_SECRET, mockDb, TEST_API_KEY, {
      expectedAppId: "tradie-app",
    });

    expect(res).toEqual({ processed: false, eventType: "ignored_other_app" });
    expect(handleCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("returns already_processed when idempotency claim yields zero rows", async () => {
    const { rawBody, signature } = makeSignedEvent("customer.subscription.updated", {
      id: "sub_1",
    });
    const mockDb = makeMockDb([]);

    const res = await handleStripeWebhook(rawBody, signature, TEST_SECRET, mockDb, TEST_API_KEY);

    expect(res).toEqual({
      processed: true,
      eventType: "customer.subscription.updated (already_processed)",
    });
    expect(handleSubscriptionUpdated).not.toHaveBeenCalled();
  });

  it("routes checkout.session.completed payment mode to onOneTimeCheckoutCompleted", async () => {
    const { rawBody, signature } = makeSignedEvent("checkout.session.completed", {
      id: "cs_pay_1",
      mode: "payment",
      metadata: { appId: "tradie-app" },
    });
    const mockDb = makeMockDb();
    const onOneTimeCheckoutCompleted = vi.fn(async () => undefined);

    const res = await handleStripeWebhook(rawBody, signature, TEST_SECRET, mockDb, TEST_API_KEY, {
      expectedAppId: "tradie-app",
      onOneTimeCheckoutCompleted,
    });

    expect(res).toEqual({ processed: true, eventType: "checkout.session.completed" });
    expect(onOneTimeCheckoutCompleted).toHaveBeenCalledTimes(1);
    expect(handleCheckoutSessionCompleted).not.toHaveBeenCalled();
  });

  it("routes subscription checkout, updates, deletions, and invoice events to handlers", async () => {
    const mockDb = makeMockDb();

    const subCheckout = makeSignedEvent("checkout.session.completed", {
      id: "cs_sub_1",
      mode: "subscription",
    });
    await expect(
      handleStripeWebhook(subCheckout.rawBody, subCheckout.signature, TEST_SECRET, mockDb, TEST_API_KEY)
    ).resolves.toEqual({ processed: true, eventType: "checkout.session.completed" });
    expect(handleCheckoutSessionCompleted).toHaveBeenCalledTimes(1);

    const subUpdated = makeSignedEvent("customer.subscription.updated", { id: "sub_1" });
    await handleStripeWebhook(subUpdated.rawBody, subUpdated.signature, TEST_SECRET, mockDb, TEST_API_KEY);
    expect(handleSubscriptionUpdated).toHaveBeenCalledTimes(1);

    const subDeleted = makeSignedEvent("customer.subscription.deleted", { id: "sub_1" });
    await handleStripeWebhook(subDeleted.rawBody, subDeleted.signature, TEST_SECRET, mockDb, TEST_API_KEY);
    expect(handleSubscriptionDeleted).toHaveBeenCalledTimes(1);

    const invSucceeded = makeSignedEvent("invoice.payment_succeeded", { id: "in_1" });
    await handleStripeWebhook(invSucceeded.rawBody, invSucceeded.signature, TEST_SECRET, mockDb, TEST_API_KEY);
    expect(handleInvoicePaymentSucceeded).toHaveBeenCalledTimes(1);

    const invFailed = makeSignedEvent("invoice.payment_failed", { id: "in_2" });
    await handleStripeWebhook(invFailed.rawBody, invFailed.signature, TEST_SECRET, mockDb, TEST_API_KEY);
    expect(handleInvoicePaymentFailed).toHaveBeenCalledTimes(1);

    const unknownEvt = makeSignedEvent("charge.refunded", { id: "ch_1" });
    await expect(
      handleStripeWebhook(unknownEvt.rawBody, unknownEvt.signature, TEST_SECRET, mockDb, TEST_API_KEY)
    ).resolves.toEqual({ processed: true, eventType: "charge.refunded" });
  });
});
