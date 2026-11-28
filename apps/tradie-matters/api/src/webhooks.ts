import { createDbClient } from "@kaesava/core";
import {
  createAccountingAdapter,
  extractReceiptViaAiVisionQuery,
  grantSmsCreditPackCommand,
  handleAccountingPaymentWebhookCommand,
  handleInboundTwilioSms,
  handleTwilioMissedCallWebhook,
  processInboundSupplierEmailCommand,
  saveAccountingConnectionCommand,
  verifyTwilioSignature,
  type AccountingProvider,
  type SmsCreditPackKey,
} from "@tradie-matters/capability-integrations";
import type Stripe from "stripe";
import { eq, isNull, and } from "drizzle-orm";
import { tmBusinessProfiles as tmBusinessSettings, type DbOrTx } from "@kaesava/db/rings/tradie-matters";

export interface TradieWebhookEnv {
  TRADIE_MATTERS_APP_ID?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  XERO_WEBHOOK_KEY?: string;
  QBO_WEBHOOK_VERIFIER_TOKEN?: string;
  XERO_CLIENT_ID?: string;
  XERO_CLIENT_SECRET?: string;
  MYOB_CLIENT_ID?: string;
  MYOB_CLIENT_SECRET?: string;
  QBO_CLIENT_ID?: string;
  QBO_CLIENT_SECRET?: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  CLOUDFLARE_API_TOKEN?: string;
  R2_BUCKET?: {
    put: (key: string, value: ArrayBuffer | Uint8Array | string, opts?: { httpMetadata?: { contentType?: string } }) => Promise<unknown>;
  };
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
  const uploadMediaToR2 = env.R2_BUCKET
    ? async (url: string, key: string) => {
        const res = await fetch(url);
        const buf = await res.arrayBuffer();
        const mimeType = res.headers.get("content-type") ?? "image/jpeg";
        await env.R2_BUCKET!.put(key, buf, { httpMetadata: { contentType: mimeType } });
        return { fileKey: key, fileName: key.split("/").pop() ?? "mms-media", mimeType, size: buf.byteLength };
      }
    : undefined;

  const result = await handleInboundTwilioSms(db, {
    toNumber: params.To ?? "",
    fromNumber: params.From ?? "",
    body: params.Body ?? "",
    mediaUrls,
    uploadMediaToR2,
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
  const dialStatus = (params.DialCallStatus ?? "").toLowerCase();
  const isMissed = !dialStatus || dialStatus === "no-answer" || dialStatus === "busy" || dialStatus === "failed";
  if (isMissed) {
    const db = createDbClient();
    await handleTwilioMissedCallWebhook(db, env, {
      toNumber: params.To ?? "",
      fromNumber: params.From ?? "",
      callSid: params.CallSid ?? "",
    });
  }
  return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
    status: 200,
    headers: { "Content-Type": "application/xml", ...baseHeaders },
  });
}

async function verifyXeroSignature(webhookKey: string, rawBody: string, signature: string): Promise<boolean> {
  if (!signature) return false;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(webhookKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuf = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function handleAccountingWebhook(
  request: Request,
  providerParam: string,
  baseHeaders: Record<string, string>,
  env: TradieWebhookEnv = {}
): Promise<Response> {
  const provider = providerParam.toUpperCase() as AccountingProvider;
  if (provider !== "XERO" && provider !== "MYOB" && provider !== "QBO") {
    return new Response(JSON.stringify({ error: "Unsupported accounting provider" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
  const rawBody = await request.text();
  if (provider === "XERO" && env.XERO_WEBHOOK_KEY) {
    const sig = request.headers.get("x-xero-signature") ?? "";
    const valid = await verifyXeroSignature(env.XERO_WEBHOOK_KEY, rawBody, sig);
    if (!valid) {
      return new Response(null, { status: 401, headers: baseHeaders });
    }
  }
  if (provider === "QBO" && env.QBO_WEBHOOK_VERIFIER_TOKEN) {
    const sig = request.headers.get("intuit-signature") ?? "";
    const valid = await verifyXeroSignature(env.QBO_WEBHOOK_VERIFIER_TOKEN, rawBody, sig);
    if (!valid) {
      return new Response(null, { status: 401, headers: baseHeaders });
    }
  }
  let body: { externalInvoiceId?: string } = {};
  try {
    body = JSON.parse(rawBody) as { externalInvoiceId?: string };
  } catch {
    body = {};
  }
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

export async function handleAccountingOAuthCallback(
  request: Request,
  providerParam: string,
  env: TradieWebhookEnv,
  baseHeaders: Record<string, string>,
  ctx: { tenantId: string; appId: string; userId: string }
): Promise<Response> {
  const provider = providerParam.toUpperCase() as AccountingProvider;
  if (provider !== "XERO" && provider !== "MYOB" && provider !== "QBO") {
    return new Response(JSON.stringify({ error: "Unsupported accounting provider" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectUri = `${url.origin}${url.pathname}`;
  if (!code) {
    return new Response(JSON.stringify({ error: "Missing OAuth code" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...baseHeaders },
    });
  }
  const adapter = createAccountingAdapter(provider, env);
  const tokens = await adapter.exchangeCode(code, redirectUri);
  const db = createDbClient();
  const conn = await saveAccountingConnectionCommand(db, ctx, {
    provider,
    externalTenantId: tokens.externalTenantId,
    externalTenantName: tokens.externalTenantName,
    accessTokenEnc: tokens.accessToken,
    refreshTokenEnc: tokens.refreshToken,
    tokenExpiresAt: tokens.expiresAt ? tokens.expiresAt.toISOString() : null,
  });
  return new Response(JSON.stringify({ connected: true, connectionId: conn?.id }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...baseHeaders },
  });
}

export async function handleInboundSupplierEmailEvent(
  message: InboundEmailMessage,
  defaultAppId: string,
  env: TradieWebhookEnv & { receiptOcrEnabled?: boolean } = {}
): Promise<void> {
  const db = createDbClient();
  let tenantId = message.headers.get("x-tradie-tenant-id");
  let userId = message.headers.get("x-tradie-user-id");

  if (!tenantId) {
    const slug = message.to.split("@")[0]?.toLowerCase();
    if (slug) {
      const [settings] = await db
        .select({ tenantId: tmBusinessSettings.tenantId, createdBy: tmBusinessSettings.createdBy })
        .from(tmBusinessSettings)
        .where(and(eq(tmBusinessSettings.supplierInboxSlug, slug), isNull(tmBusinessSettings.archivedAt)))
        .limit(1);
      if (settings) {
        tenantId = settings.tenantId;
        userId = userId ?? settings.createdBy;
      }
    }
  }

  if (!tenantId || !userId) return;
  const subject = message.headers.get("subject") ?? "Supplier Bill";
  const bodyText = await new Response(message.raw).text();

  let ocrFields: { subtotalExTax?: number; taxAmount?: number; totalIncTax?: number; supplierAbn?: string | null } = {};
  if (env.receiptOcrEnabled && env.CF_ACCOUNT_ID && env.CF_AI_GATEWAY_ID && env.CLOUDFLARE_API_TOKEN) {
    const base64Match = bodyText.match(/Content-Transfer-Encoding:\s*base64\r?\n\r?\n([A-Za-z0-9+/=\r\n]+)/i);
    if (base64Match?.[1]) {
      try {
        const extracted = await extractReceiptViaAiVisionQuery(env, {
          imageBase64: base64Match[1].replace(/\s+/g, ""),
          mimeType: "image/jpeg",
        });
        ocrFields = {
          subtotalExTax: extracted.subtotalExTax,
          taxAmount: extracted.taxAmount,
          totalIncTax: extracted.totalIncTax,
          supplierAbn: extracted.supplierAbn,
        };
      } catch {
        // Fallback to email-only draft bill
      }
    }
  }

  await processInboundSupplierEmailCommand(
    db,
    { tenantId, appId: defaultAppId, userId },
    {
      fromEmail: message.from,
      supplierName: message.from.split("@")[0] || "Supplier",
      subject,
      bodyText,
      ...ocrFields,
    }
  );
}
