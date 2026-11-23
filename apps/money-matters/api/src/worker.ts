import '@money-matters/capability-budgeting/i18n';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { logger } from '@kaesava/core';
import {
  createPlatformWorker,
  handleResetPasswordRequest,
  isValidRedirectUrl,
  handleDevCallbackRequest,
  type PlatformWorkerEnvBase,
} from '@kaesava/core/worker';
import { handleStripeWebhookRequest } from '@kaesava/capability-billing/worker';
import { createFileNotesRouteHandler } from '@kaesava/capability-file-notes/worker';
import { validateEnv, createAppEnvSchema } from '@kaesava/config';
import { registerMoneyMattersApp } from '@money-matters/capability-budgeting';
import { z } from 'zod';
import { appRouter } from './routers/_app.js';
import { createEdgeContext } from './trpc/edge-context.js';
import { inngest, syncInngestEventKey } from './inngest/client.js';
import { functions } from './inngest/index.js';
import { serve } from 'inngest/cloudflare';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

const handleFileNotesRequest = createFileNotesRouteHandler<WorkerEnv>({
  resolveContext: (request, env, resHeaders) =>
    createEdgeContext(
      { req: request, resHeaders, info: {} as unknown as FetchCreateContextFnOptions['info'] },
      env
    ),
});

export { isValidRedirectUrl };

export interface WorkerEnv extends PlatformWorkerEnvBase {
  MONEY_MATTERS_APP_ID: string;
  STORAGE_BUCKET_NAME: string;
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  GLOBAL_MAX_FILE_SIZE_MB: string;
  NEON_AUTH_BASE_URL: string;
  NEON_AUTH_JWKS_URL: string;
  DATABASE_URL?: string;
  INNGEST_SIGNING_KEY?: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PRICE_MONTHLY?: string;
  STRIPE_PRICE_ANNUAL?: string;
  STRIPE_PRICE_FOUNDING_ANNUAL?: string;
  CF_ACCOUNT_ID?: string;
  CF_AI_GATEWAY_ID?: string;
  CF_AI_API_TOKEN?: string;
  AI_MODEL_ID?: string;
}

export async function handleTrpcRequest(
  request: Request,
  env: WorkerEnv,
  correlationId: string,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const response = await fetchRequestHandler({
    endpoint: '/trpc',
    req: request,
    router: appRouter,
    createContext: (opts) => createEdgeContext(opts, env),
    onError: ({ error, path }) => {
      logger.error(`[tRPC Error] path '${path}'`, { correlationId, error });
    },
  });

  const newHeaders = new Headers(response.headers);
  Object.entries(baseHeaders).forEach(([key, val]) => {
    newHeaders.set(key, val);
  });
  newHeaders.set('x-correlation-id', correlationId);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

const moneyMattersWorkerEnvSchema = createAppEnvSchema({
  MONEY_MATTERS_APP_ID: z.string().uuid().optional(),
});

registerMoneyMattersApp();

export default createPlatformWorker<WorkerEnv>({
  resolveDefaultAppId: (env) => env.MONEY_MATTERS_APP_ID,
  onInitEnv: (env) => {
    registerMoneyMattersApp();
    syncInngestEventKey(env.INNGEST_EVENT_KEY);
    validateEnv(env as unknown as Record<string, unknown>);
    moneyMattersWorkerEnvSchema.safeParse(env);
  },
  routes: [
    async ({ request, url, env, ctx, correlationId, isDev }) => {
      if (!url.pathname.startsWith('/api/inngest')) return null;
      const inngestHandler = serve({
        client: inngest,
        functions,
        servePath: '/api/inngest',
        signingKey: isDev ? undefined : env.INNGEST_SIGNING_KEY,
      }) as unknown as (
        req: Request,
        e: Record<string, string | undefined>,
        c?: { waitUntil: (promise: Promise<unknown>) => void }
      ) => Promise<Response>;

      const inngestRes = await inngestHandler(
        request,
        env as unknown as Record<string, string | undefined>,
        ctx
      );
      const inngestHeaders = new Headers(inngestRes.headers);
      inngestHeaders.set('x-correlation-id', correlationId);
      return new Response(inngestRes.body, {
        status: inngestRes.status,
        statusText: inngestRes.statusText,
        headers: inngestHeaders,
      });
    },
    async ({ request, url, env, baseHeaders }) =>
      url.pathname === '/webhooks/stripe' && request.method === 'POST'
        ? handleStripeWebhookRequest(request, env, baseHeaders)
        : null,
    ({ url, baseHeaders }) =>
      url.pathname === '/reset-password' ? handleResetPasswordRequest(url, baseHeaders) : null,
    ({ url, isDev, baseHeaders }) =>
      url.pathname.startsWith('/dev-callback') ? handleDevCallbackRequest(url, isDev, baseHeaders) : null,
    async ({ request, url, env, correlationId, baseHeaders }) =>
      url.pathname.startsWith('/api/file-notes/')
        ? handleFileNotesRequest(request, url, env, correlationId, baseHeaders)
        : null,
    async ({ request, url, env, correlationId, baseHeaders }) =>
      url.pathname.startsWith('/trpc')
        ? handleTrpcRequest(request, env, correlationId, baseHeaders)
        : null,
  ],
});
