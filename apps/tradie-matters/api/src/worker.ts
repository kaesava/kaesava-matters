import {
  createPlatformWorker,
  handleResetPasswordRequest,
  handleDevCallbackRequest,
  type PlatformWorkerEnvBase,
} from "@kaesava/core/worker";
import { serve } from "inngest/cloudflare";
import { registerTradieMattersApp, TRADIE_MATTERS_APP_ID } from "./manifest.js";
import { inngest, functions, syncInngestEventKey } from "./inngest/client.js";

export interface TradieWorkerEnv extends PlatformWorkerEnvBase {
  TRADIE_MATTERS_APP_ID?: string;
  INNGEST_SIGNING_KEY?: string;
}

registerTradieMattersApp();

export default createPlatformWorker<TradieWorkerEnv>({
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
      const res = await inngestHandler(
        request,
        inngestEnv,
        ctx
      );
      const headers = new Headers(res.headers);
      headers.set("x-correlation-id", correlationId);
      return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
    },
    ({ url, env, baseHeaders }) =>
      url.pathname === "/reset-password"
        ? handleResetPasswordRequest(url, baseHeaders, env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID)
        : null,
    ({ url, isDev, env, baseHeaders }) =>
      url.pathname.startsWith("/dev-callback")
        ? handleDevCallbackRequest(url, isDev, baseHeaders, env.TRADIE_MATTERS_APP_ID || TRADIE_MATTERS_APP_ID)
        : null,
  ],
});
