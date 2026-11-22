import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { logger } from "@kaesava/core";
import { enforceAuthProxyRateLimit, type RateLimitEnv } from "./rateLimitAuth";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function OPTIONS(req: NextRequest) {
  return handleProxy(req);
}

function isValidOrigin(req: NextRequest): boolean {
  const allowedOrigins = [
    "https://moneymatters.kaesava.au",
    "https://api.moneymatters.kaesava.au",
    ...(process.env.NODE_ENV !== "production"
      ? [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3001",
          "http://localhost:8787",
          "http://127.0.0.1:8787",
        ]
      : []),
  ];

  const origin = req.headers.get("origin");
  if (origin) {
    return allowedOrigins.includes(origin);
  }

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return allowedOrigins.includes(refererOrigin);
    } catch {
      return false;
    }
  }

  const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
  if (isStateChanging) {
    return false;
  }

  // Same-origin GET/HEAD/OPTIONS requests may omit Origin/Referer
  return true;
}

const SAFE_FORWARD_HEADERS = new Set([
  "accept",
  "accept-language",
  "content-type",
  "cookie",
  "user-agent",
  "x-correlation-id",
]);

interface AuthProxyEnv extends RateLimitEnv {
  NEXT_PUBLIC_NEON_AUTH_URL?: string;
  NEON_AUTH_BASE_URL?: string;
  DEV_NEON_AUTH_ORIGIN?: string;
}

function jsonProxyError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleProxy(req: NextRequest) {
  try {
    const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
    if (isStateChanging && !isValidOrigin(req)) {
      return jsonProxyError("CSRF validation failed: Invalid Origin or Referer", 403);
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/auth/, "");
    const hasBody = req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS";
    let bodyText = hasBody ? await req.text() : "";

    let cfEnv: AuthProxyEnv | undefined;
    try {
      const ctx = await getCloudflareContext({ async: true });
      cfEnv = ctx.env as unknown as AuthProxyEnv;
    } catch {
      cfEnv = undefined;
    }

    if (isStateChanging) {
      const clientIp =
        req.headers.get("cf-connecting-ip") ||
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        "unknown";
      const rateLimitResponse = await enforceAuthProxyRateLimit(path, clientIp, bodyText, cfEnv);
      if (rateLimitResponse) {
        return rateLimitResponse;
      }
    }

    const authBase =
      process.env.NEXT_PUBLIC_NEON_AUTH_URL ||
      cfEnv?.NEXT_PUBLIC_NEON_AUTH_URL ||
      cfEnv?.NEON_AUTH_BASE_URL;
    if (!authBase) {
      return jsonProxyError("NEXT_PUBLIC_NEON_AUTH_URL is not set", 500);
    }

    const targetUrl = `${authBase}${path}${url.search}`;
    logger.debug(`[Auth Proxy] Forwarding ${req.method}`, { targetUrl });

    const headers = new Headers();
    req.headers.forEach((value, key) => {
      if (SAFE_FORWARD_HEADERS.has(key.toLowerCase())) {
        headers.set(key, value);
      }
    });

    // In dev mode, map un-prefixed neon-auth cookies back to __Secure- for the target Neon auth server
    const reqCookie = req.headers.get("cookie");
    if (process.env.NODE_ENV === "development") {
      logger.debug('[Auth Proxy] Incoming cookie header present', { hasCookie: Boolean(reqCookie) });
      if (reqCookie) {
        let mapped = reqCookie;
        if (mapped.includes("neon-auth.session_token=") && !mapped.includes("__Secure-neon-auth.session_token=")) {
          mapped = mapped.replace(/neon-auth\.session_token=/g, "__Secure-neon-auth.session_token=");
        }
        if (mapped.includes("neon-auth.session_challange=") && !mapped.includes("__Secure-neon-auth.session_challange=")) {
          mapped = mapped.replace(/neon-auth\.session_challange=/g, "__Secure-neon-auth.session_challange=");
        }
        if (mapped.includes("neon-auth.session_challenge=") && !mapped.includes("__Secure-neon-auth.session_challenge=")) {
          mapped = mapped.replace(/neon-auth\.session_challenge=/g, "__Secure-neon-auth.session_challenge=");
        }
        if (mapped !== reqCookie) {
          headers.set("cookie", mapped);
          logger.debug('[Auth Proxy] Cookie header remapped for backend (Secure prefix added)');
        }
      }
    }

    // Align origin and referer headers to match the target auth server domain
    const targetOrigin = new URL(authBase).origin;
    headers.set("origin", targetOrigin);
    headers.set("referer", authBase);

    const options: RequestInit = {
      method: req.method,
      headers,
    };

    if (hasBody) {
      const devAllowedOrigin = process.env.DEV_NEON_AUTH_ORIGIN || cfEnv?.DEV_NEON_AUTH_ORIGIN;
      if (process.env.NODE_ENV === "development" && devAllowedOrigin && bodyText) {
        try {
          const bodyJson = JSON.parse(bodyText);
          const reqHost = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
          const reqProto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
          let mutated = false;
          for (const field of ["callbackURL", "errorCallbackURL", "redirectTo"] as const) {
            const originalUrl = bodyJson[field];
            if (typeof originalUrl === "string" && originalUrl) {
              const urlObj = new URL(originalUrl, req.url);
              const rewritten = new URL(`${devAllowedOrigin}/dev-callback/${reqProto}/${reqHost}`);
              rewritten.searchParams.set("target", urlObj.pathname + urlObj.search);
              bodyJson[field] = rewritten.toString();
              mutated = true;
              logger.debug(`[Auth Proxy] Rewrote ${field}`, { from: originalUrl, to: bodyJson[field] });
            }
          }
          if (mutated) {
            bodyText = JSON.stringify(bodyJson);
          }
        } catch (_e) {
          // Ignore JSON parse errors
        }
      }
      headers.delete("content-length");
      options.body = bodyText;
    }

    const response = await fetch(targetUrl, options);
    const buffer = await response.arrayBuffer();

    logger.debug('[Auth Proxy] Target response status', { status: response.status });
    if (response.status >= 400) {
      const errorSnippet = new TextDecoder().decode(buffer).slice(0, 300);
      logger.warn('[Auth Proxy] Target error response', { path, status: response.status, errorSnippet });
    }

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "transfer-encoding" && 
        lowerKey !== "content-encoding" && 
        lowerKey !== "content-length" &&
        lowerKey !== "set-cookie"
      ) {
        if (lowerKey === "location" && process.env.NODE_ENV === "development") {
          const incomingHost = req.headers.get("host") || "localhost:3000";
          const proto = req.headers.get("x-forwarded-proto") || (req.url.startsWith("https") ? "https" : "http");
          try {
            const locUrl = new URL(value);
            if (locUrl.host === "localhost:3000") {
              locUrl.protocol = proto;
              locUrl.host = incomingHost;
              value = locUrl.toString();
              logger.debug('[Auth Proxy] Rewrote redirect Location', { to: value });
            }
          } catch (_e) {
            // Relative URL or invalid URL, keep it
          }
        }
        responseHeaders.set(key, value);
      }
    });

    // Extract individual Set-Cookie headers using getSetCookie if available
    const headersWithGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = typeof headersWithGetSetCookie.getSetCookie === "function"
      ? headersWithGetSetCookie.getSetCookie()
      : response.headers.get("set-cookie")?.split(",") ?? [];

    for (let cookieVal of setCookies) {
      if (process.env.NODE_ENV === "development") {
        // Strip Secure flag, Partitioned flag and drop __Secure- prefix when running on http://localhost or insecure contexts
        cookieVal = cookieVal
          .replace(/;\s*Secure/gi, "")
          .replace(/;\s*Partitioned/gi, "")
          .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
          .replace(/__Secure-/gi, "");
      }
      responseHeaders.append("set-cookie", cookieVal.trim());
    }

    logger.debug('[Auth Proxy] Response cookies forwarded to client');

    return new Response(buffer, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err) {
    logger.error("[Auth Proxy] Upstream connection error", { err });
    return jsonProxyError("Failed to connect to auth service", 502);
  }
}
