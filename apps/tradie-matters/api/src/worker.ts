import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { createDbClient, logger } from "@kaesava/core";
import { handleStripeConnectWebhook } from "@tradie-matters/capability-operations";
import {
  createPlatformWorker,
  handleResetPasswordRequest,
  handleDevCallbackRequest,
  type PlatformWorkerEnvBase,
} from "@kaesava/core/worker";
import { handleStripeWebhookRequest } from "@kaesava/capability-billing/worker";
import { createFileNotesRouteHandler } from "@kaesava/capability-file-notes/worker";
import { serve } from "inngest/cloudflare";
import { registerTradieMattersApp, TRADIE_MATTERS_APP_ID } from "./manifest.js";
import { inngest, functions, syncInngestEventKey } from "./inngest/client.js";
import { appRouter } from "./routers/_app.js";
import { createEdgeContext } from "./trpc/context.js";
import {
  handleAccountingWebhook,
  handleInboundSupplierEmailEvent,
  handleSmsPackOneTimeCheckout,
  handleTwilioSmsWebhook,
  handleTwilioVoiceWebhook,
  type InboundEmailMessage,
} from "./webhooks.js";

export interface TradieWorkerEnv extends PlatformWorkerEnvBase {
  TRADIE_MATTERS_APP_ID?: string;
  INNGEST_SIGNING_KEY?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_CONNECT_WEBHOOK_SECRET?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  STORAGE_BUCKET_NAME?: string;
  STORAGE_ENDPOINT?: string;
  STORAGE_REGION?: string;
  GLOBAL_MAX_FILE_SIZE_MB?: string;
}

const handleFileNotesRequest = createFileNotesRouteHandler<TradieWorkerEnv>({
  resolveContext: (request, env, resHeaders) =>
    createEdgeContext(
      { req: request, resHeaders, info: {} as unknown as FetchCreateContextFnOptions["info"] },
      env
    ),
});

async function handleTrpcRequest(
  request: Request,
  env: TradieWorkerEnv,
  correlationId: string,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const response = await fetchRequestHandler({
    endpoint: "/trpc",
    req: request,
    router: appRouter,
    createContext: (opts) => createEdgeContext(opts, env),
    onError: ({ error, path }) => {
      logger.error(`[Tradie tRPC Error] path '${path}'`, { correlationId, error });
    },
  });

  const headers = new Headers(response.headers);
  Object.entries(baseHeaders).forEach(([key, val]) => headers.set(key, val));
  headers.set("x-correlation-id", correlationId);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

registerTradieMattersApp();

const platformWorker = createPlatformWorker<TradieWorkerEnv>({
  resolveDefaultAppId: (env) => env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID,
  onInitEnv: (env) => {
    registerTradieMattersApp();
    syncInngestEventKey(env.INNGEST_EVENT_KEY);
  },
  routes: [
    async ({ request, url, env, ctx, correlationId, isDev }) => {
      if (!url.pathname.startsWith("/api/inngest")) return null;
      const inngestEnv: Record<string, string | undefined> = {
        ...(env as unknown as Record<string, string | undefined>),
      };
      if (isDev) {
        inngestEnv.INNGEST_DEV = "http://127.0.0.1:8288";
        inngestEnv.ENVIRONMENT = "development";
        delete inngestEnv.INNGEST_SIGNING_KEY;
      }
      const inngestHandler = serve({
        client: inngest,
        functions,
        servePath: "/api/inngest",
        signingKey: isDev ? undefined : env.INNGEST_SIGNING_KEY,
      }) as unknown as (
        req: Request,
        e: Record<string, string | undefined>,
        c?: { waitUntil: (promise: Promise<unknown>) => void }
      ) => Promise<Response>;
      const res = await inngestHandler(request, inngestEnv, ctx);
      const headers = new Headers(res.headers);
      headers.set("x-correlation-id", correlationId);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    },
    async ({ request, url, env, baseHeaders }) =>
      url.pathname === "/webhooks/stripe" && request.method === "POST"
        ? handleStripeWebhookRequest(
            request,
            env as unknown as Parameters<typeof handleStripeWebhookRequest>[1],
            baseHeaders,
            {
              onOneTimeCheckoutCompleted: (session, db) =>
                handleSmsPackOneTimeCheckout(
                  session,
                  db,
                  env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID
                ),
            }
          )
        : null,
    async ({ request, url, env, baseHeaders }) =>
      url.pathname === "/webhooks/twilio/sms" && request.method === "POST"
        ? handleTwilioSmsWebhook(request, env, baseHeaders)
        : null,
    async ({ request, url, env, baseHeaders }) =>
      url.pathname === "/webhooks/twilio/voice" && request.method === "POST"
        ? handleTwilioVoiceWebhook(request, env, baseHeaders)
        : null,
    async ({ request, url, baseHeaders }) => {
      if (!url.pathname.startsWith("/webhooks/accounting/") || request.method !== "POST") return null;
      const provider = url.pathname.slice("/webhooks/accounting/".length);
      return handleAccountingWebhook(request, provider, baseHeaders);
    },
    async ({ request, url, env, baseHeaders }) => {
      if (url.pathname !== "/webhooks/stripe-connect" || request.method !== "POST") return null;
      const signature = request.headers.get("stripe-signature") ?? "";
      const rawBody = await request.text();
      const stripeSecretKey = env.STRIPE_SECRET_KEY ?? "";
      const webhookSecret = env.STRIPE_CONNECT_WEBHOOK_SECRET ?? "";
      if (!stripeSecretKey || !webhookSecret || !signature) {
        return new Response(JSON.stringify({ error: "Missing Stripe Connect webhook configuration." }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      }
      const db = createDbClient();
      const result = await handleStripeConnectWebhook(db, {
        rawBody,
        signature,
        stripeSecretKey,
        webhookSecret,
      });
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json", ...baseHeaders },
      });
    },
    ({ url, env, baseHeaders }) =>
      url.pathname === "/reset-password"
        ? handleResetPasswordRequest(
            url,
            baseHeaders,
            env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID
          )
        : null,
    ({ url, isDev, env, baseHeaders }) =>
      url.pathname.startsWith("/dev-callback")
        ? handleDevCallbackRequest(
            url,
            isDev,
            baseHeaders,
            env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID
          )
        : null,
    async ({ request, url, env, correlationId, baseHeaders }) =>
      url.pathname.startsWith("/api/file-notes/")
        ? handleFileNotesRequest(request, url, env, correlationId, baseHeaders)
        : null,
    async ({ request, url, env, correlationId, baseHeaders }) =>
      url.pathname.startsWith("/trpc")
        ? handleTrpcRequest(request, env, correlationId, baseHeaders)
        : null,
  ],
});

export default {
  ...platformWorker,
  async email(message: InboundEmailMessage, env: TradieWorkerEnv): Promise<void> {
    await handleInboundSupplierEmailEvent(
      message,
      env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID
    );
  },
};
