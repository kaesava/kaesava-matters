import { resolveAppConfigOrDefault } from "@kaesava/config";
import { logger } from "./logger.js";
import { CANONICAL_SECURITY_HEADERS, buildCorsHeaders } from "./security-headers.js";
import { enforceApiRateLimit } from "./rate-limit-middleware.js";

export interface PlatformWorkerEnvBase {
  ENVIRONMENT?: string;
  DEFAULT_APP_ID?: string;
  INNGEST_EVENT_KEY?: string;
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

export interface PlatformWorkerRouteContext<TEnv extends PlatformWorkerEnvBase> {
  request: Request;
  url: URL;
  env: TEnv;
  ctx: { waitUntil: (promise: Promise<unknown>) => void };
  correlationId: string;
  baseHeaders: Record<string, string>;
  isDev: boolean;
}

export type PlatformWorkerRouteHandler<TEnv extends PlatformWorkerEnvBase> = (
  routeCtx: PlatformWorkerRouteContext<TEnv>
) => Promise<Response | null> | Response | null;

export interface CreatePlatformWorkerOptions<TEnv extends PlatformWorkerEnvBase> {
  onInitEnv?: (env: TEnv, isDev: boolean) => void;
  resolveDefaultAppId?: (env: TEnv) => string | undefined;
  routes: ReadonlyArray<PlatformWorkerRouteHandler<TEnv>>;
}

export function createPlatformWorker<TEnv extends PlatformWorkerEnvBase>(
  options: CreatePlatformWorkerOptions<TEnv>
) {
  let isInitialized = false;

  return {
    async fetch(
      request: Request,
      env: TEnv,
      ctx: { waitUntil: (promise: Promise<unknown>) => void }
    ): Promise<Response> {
      const url = new URL(request.url);
      const isLocalHost =
        url.hostname === "localhost" ||
        url.hostname === "127.0.0.1" ||
        url.hostname === "0.0.0.0" ||
        url.hostname.startsWith("192.168.") ||
        url.hostname.startsWith("100.");
      const isDev =
        env.ENVIRONMENT === "development" ||
        process.env.NODE_ENV === "development" ||
        isLocalHost;

      if (isDev) {
        process.env.ENVIRONMENT = "development";
        process.env.INNGEST_DEV = "http://127.0.0.1:8288";
        delete process.env.INNGEST_SIGNING_KEY;
      }

      if (!isInitialized && env && typeof env === "object") {
        const sanitizedEnv: Record<string, unknown> = { ...(env as Record<string, unknown>) };
        if (isDev) {
          delete sanitizedEnv.INNGEST_SIGNING_KEY;
          sanitizedEnv.INNGEST_DEV = "http://127.0.0.1:8288";
          sanitizedEnv.ENVIRONMENT = "development";
        }
        Object.assign(process.env, sanitizedEnv);
        try {
          options.onInitEnv?.(env, isDev);
          isInitialized = true;
        } catch (err) {
          logger.error("Worker environment initialization failed", { err });
        }
      }

      const appId =
        request.headers.get("x-app-id") ||
        env.DEFAULT_APP_ID ||
        options.resolveDefaultAppId?.(env);
      const appConfig = resolveAppConfigOrDefault(appId);
      const correlationId = request.headers.get("x-correlation-id") || crypto.randomUUID();
      const corsHeaders = buildCorsHeaders(
        request.headers.get("Origin"),
        isDev,
        appConfig.allowedRedirectHosts
      );
      const baseHeaders: Record<string, string> = {
        ...corsHeaders,
        ...CANONICAL_SECURITY_HEADERS,
        "x-correlation-id": correlationId,
      };

      try {
        if (request.method === "OPTIONS") {
          return new Response(null, { status: 204, headers: baseHeaders });
        }

        if (url.pathname === "/health") {
          return new Response(
            JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
            {
              status: 200,
              headers: { "Content-Type": "application/json", ...baseHeaders },
            }
          );
        }

        const rateLimitResponse = await enforceApiRateLimit(request, url, baseHeaders, env);
        if (rateLimitResponse) return rateLimitResponse;

        const routeCtx: PlatformWorkerRouteContext<TEnv> = {
          request,
          url,
          env,
          ctx,
          correlationId,
          baseHeaders,
          isDev,
        };

        for (const route of options.routes) {
          const response = await route(routeCtx);
          if (response) return response;
        }

        return new Response(JSON.stringify({ error: "Route not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...baseHeaders },
        });
      } catch (err: unknown) {
        logger.error("[WORKER UNCAUGHT ERROR]", { correlationId, err });
        const rawMessage = err instanceof Error ? err.message : "Internal Server Error";
        const isInternalOrDbError =
          /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"/i.test(
            rawMessage
          );
        const safeMessage =
          !isDev && isInternalOrDbError
            ? `Internal Server Error. Please contact ${appConfig.branding.supportEmail} with your correlation ID.`
            : rawMessage;

        return new Response(
          JSON.stringify({
            error: { message: safeMessage, code: "INTERNAL_SERVER_ERROR" },
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json", ...baseHeaders },
          }
        );
      }
    },
  };
}
