import { logger } from "../logger.js";
import { enforceAuthProxyRateLimit, type AuthProxyRateLimitEnv } from "./rate-limit-auth.js";

const SAFE_FORWARD_HEADERS = new Set([
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "user-agent",
  "x-correlation-id",
]);

export interface AuthProxyEnv extends AuthProxyRateLimitEnv {
  NEXT_PUBLIC_NEON_AUTH_URL?: string;
  NEON_AUTH_BASE_URL?: string;
  DEV_NEON_AUTH_ORIGIN?: string;
}

export interface AuthProxyConfig {
  allowedOrigins: readonly string[];
  getCloudflareEnv?: () => Promise<AuthProxyEnv | undefined>;
}

function isValidOrigin(req: Request, allowedOrigins: readonly string[]): boolean {
  const origin = req.headers.get("origin");
  if (origin) return allowedOrigins.includes(origin);

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return allowedOrigins.includes(new URL(referer).origin);
    } catch {
      return false;
    }
  }

  return ["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
}

function jsonProxyError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function mapDevCookiesToSecure(reqCookie: string): string {
  let mapped = reqCookie;
  for (const name of [
    "neon-auth.session_token",
    "neon-auth.session_challange",
    "neon-auth.session_challenge",
  ]) {
    if (mapped.includes(`${name}=`) && !mapped.includes(`__Secure-${name}=`)) {
      mapped = mapped.replace(new RegExp(`${name.replace(".", "\\.")}=`, "g"), `__Secure-${name}=`);
    }
  }
  return mapped;
}

function copyResponseCookies(response: Response, responseHeaders: Headers, isDev: boolean): void {
  const getSetCookie = (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie;
  const rawCookies = typeof getSetCookie === "function" ? getSetCookie.call(response.headers) : [];
  for (let cookie of rawCookies) {
    cookie = cookie.replace(/;\s*Domain=[^;]+/gi, "");
    if (isDev) {
      cookie = cookie.replace(/__Secure-/gi, "").replace(/;\s*Secure/gi, "");
      cookie = cookie.replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
    }
    responseHeaders.append("set-cookie", cookie);
  }
}

export function createAuthProxyHandlers(config: AuthProxyConfig) {
  async function handleProxy(req: Request): Promise<Response> {
    try {
      const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
      if (isStateChanging && !isValidOrigin(req, config.allowedOrigins)) {
        return jsonProxyError("CSRF validation failed: Invalid Origin or Referer", 403);
      }

      const url = new URL(req.url);
      const path = url.pathname.replace(/^\/api\/auth/, "");
      const hasBody = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
      const bodyText = hasBody ? await req.text() : "";
      const cfEnv = config.getCloudflareEnv ? await config.getCloudflareEnv().catch(() => undefined) : undefined;

      if (isStateChanging) {
        const clientIp =
          req.headers.get("cf-connecting-ip") ||
          req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          "unknown";
        const rateLimitRes = await enforceAuthProxyRateLimit(path, clientIp, bodyText, cfEnv);
        if (rateLimitRes) return rateLimitRes;
      }

      const authBase =
        process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
        cfEnv?.NEXT_PUBLIC_NEON_AUTH_URL ||
        cfEnv?.NEON_AUTH_BASE_URL;
      if (!authBase) return jsonProxyError("NEXT_PUBLIC_NEON_AUTH_URL is not set", 500);

      const headers = new Headers();
      req.headers.forEach((value, key) => {
        if (SAFE_FORWARD_HEADERS.has(key.toLowerCase())) headers.set(key, value);
      });

      const isDev = process.env.NODE_ENV === "development";
      const reqCookie = req.headers.get("cookie");
      if (isDev && reqCookie) headers.set("cookie", mapDevCookiesToSecure(reqCookie));

      headers.set("origin", new URL(authBase).origin);
      headers.set("referer", authBase);
      if (hasBody) headers.delete("content-length");

      const upstream = await fetch(`${authBase}${path}${url.search}`, {
        method: req.method,
        headers,
        ...(hasBody ? { body: bodyText } : {}),
      });

      const buffer = await upstream.arrayBuffer();
      const responseHeaders = new Headers();
      const contentType = upstream.headers.get("content-type");
      if (contentType) responseHeaders.set("content-type", contentType);
      copyResponseCookies(upstream, responseHeaders, isDev);

      return new Response(buffer, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: responseHeaders,
      });
    } catch (err) {
      logger.error("[Auth Proxy] Unexpected error", { err });
      return jsonProxyError("Authentication proxy error", 502);
    }
  }

  return {
    GET: (req: Request) => handleProxy(req),
    POST: (req: Request) => handleProxy(req),
    OPTIONS: (req: Request) => handleProxy(req),
  };
}
