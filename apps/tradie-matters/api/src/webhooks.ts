import { createDbClient } from "@kaesava/core";
import {
  grantSmsCreditPackCommand,
  handleAccountingPaymentWebhookCommand,
  handleInboundTwilioSms,
  handleTwilioMissedCallWebhook,
  processInboundSupplierEmailCommand,
  verifyTwilioSignature,
  type AccountingProvider,
  type SmsCreditPackKey,
} from "@tradie-matters/capability-integrations";
import type Stripe from "stripe";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";

export interface TradieWebhookEnv {
  TRADIE_MATTERS_APP_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
}

export interface InboundEmailMessage {
  from: string;
  to: string;
  headers: Headers;
  raw: ReadableStream<Uint8Array>;
}

async function parseFormParams(request: Request): Promise<Record<string, string>> {
  const text = await request.text();
  const params = new URLSearchParams(text);
  const record: Record<string, string> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return record;
}

export async function handleTwilioSmsWebhook(
  request: Request,
  env: TradieWebhookEnv,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const params = await parseFormParams(request);
  if (env.TWILIO_AUTH_TOKEN) {
    const sig = request.headers.get("x-twilio-signature") ?? "";
    const valid = await verifyTwilioSignature(env.TWILIO_AUTH_TOKEN, request.url, params, sig);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid Twilio signature" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }
  }
  const mediaUrls: string[] = [];
  for (let i = 0; i < 10; i++) {
    const u = params[`MediaUrl${i}`];
    if (u) mediaUrls.push(u);
  }
  const db = createDbClient();
  const result = await handleInboundTwilioSms(db, {
    toNumber: params.To ?? "",
    fromNumber: params.From ?? "",
    body: params.Body ?? "",
    mediaUrls,
  });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...baseHeaders },
  });
}

export async function handleTwilioVoiceWebhook(
  request: Request,
  env: TradieWebhookEnv,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const params = await parseFormParams(request);
  if (env.TWILIO_AUTH_TOKEN) {
    const sig = request.headers.get("x-twilio-signature") ?? "";
    const valid = await verifyTwilioSignature(env.TWILIO_AUTH_TOKEN, request.url, params, sig);
    if (!valid) {
      return new Response(JSON.stringify({ error: "Invalid Twilio signature" }), {
        status: 403,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    }
  }
  const db = createDbClient();
  const result = await handleTwilioMissedCallWebhook(db, env, {
    toNumber: params.To ?? "",
    fromNumber: params.From ?? "",
    callSid: params.CallSid ?? "",
  });
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...baseHeaders },
  });
}

export async function handleAccountingWebhook(
  request: Request,
  providerParam: string,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const provider = providerParam.toUpperCase() as AccountingProvider;
  if (provider !== "XERO" && provider !== "MYOB" && provider !== "QBO") {
    return new Response(JSON.stringify({ error: "Unsupported accounting provider" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
  const body = (await request.json().catch(() => ({}))) as { externalInvoiceId?: string };
  const db = createDbClient();
  const result = body.externalInvoiceId
    ? await handleAccountingPaymentWebhookCommand(db, provider, body.externalInvoiceId)
    : { pausedChasing: false };
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json", ...baseHeaders },
  });
}

export async function handleSmsPackOneTimeCheckout(
  session: Stripe.Checkout.Session,
  db: DbOrTx,
  defaultAppId: string
): Promise<void> {
  const meta = session.metadata ?? {};
  const tenantId = meta.tenantId;
  const userId = meta.userId;
  const rawPack = meta.smsPackKey ?? meta.packKey;
  const packKey: SmsCreditPackKey | undefined =
    rawPack === "PACK_100" || rawPack === "sms_pack_100"
      ? "PACK_100"
      : rawPack === "PACK_500" || rawPack === "sms_pack_500"
        ? "PACK_500"
        : undefined;
  if (!tenantId || !userId || !packKey) return;
  await grantSmsCreditPackCommand(
    db,
    { tenantId, appId: meta.appId || defaultAppId, userId },
    { packKey, stripeCheckoutSessionId: session.id }
  );
}

export async function handleInboundSupplierEmailEvent(
  message: InboundEmailMessage,
  defaultAppId: string
): Promise<void> {
  const tenantId = message.headers.get("x-tradie-tenant-id");
  const userId = message.headers.get("x-tradie-user-id");
  if (!tenantId || !userId) return;
  const subject = message.headers.get("subject") ?? "Supplier Bill";
  const bodyText = await new Response(message.raw).text();
  const db = createDbClient();
  await processInboundSupplierEmailCommand(
    db,
    { tenantId, appId: defaultAppId, userId },
    {
      fromEmail: message.from,
      supplierName: message.from.split("@")[0] || "Supplier",
      subject,
      bodyText,
    }
  );
}
