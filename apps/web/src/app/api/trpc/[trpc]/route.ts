import { NextRequest } from "next/server";
import { buildTrpcProxyHeaders } from "@money-matters/core";
import { DEFAULT_APP_ID } from "@money-matters/config";

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

const DEV_PROBE_TIMEOUT_MS = 3000;
const DEV_PROBE_CACHE_TTL_MS = 60_000;

let cachedActiveBase: string | null = null;
let lastProbeTime = 0;
let inFlightProbe: Promise<string> | null = null;

async function probeHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(DEV_PROBE_TIMEOUT_MS),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeDevApiBase(): Promise<string> {
  const customUrl = process.env.NEXT_PUBLIC_API_URL;
  if (customUrl && !customUrl.includes("moneymatters.kaesava.au")) {
    const cleanUrl = customUrl
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/trpc$/, "")
      .replace("://localhost:", "://127.0.0.1:");
    if (await probeHealth(cleanUrl)) {
      cachedActiveBase = cleanUrl;
      lastProbeTime = Date.now();
      return cachedActiveBase;
    }
  }

  for (const port of [3001, 8787, 3002, 3003, 3004]) {
    const candidate = `http://127.0.0.1:${port}`;
    if (await probeHealth(candidate)) {
      cachedActiveBase = candidate;
      lastProbeTime = Date.now();
      return cachedActiveBase;
    }
  }

  return "http://127.0.0.1:3001";
}

async function resolveApiBase(): Promise<string> {
  if (process.env.NODE_ENV !== "development") {
    let envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      envUrl = envUrl.replace("api.kaesava.au", "api.moneymatters.kaesava.au");
      return envUrl.trim().replace(/\/+$/, "").replace(/\/trpc$/, "");
    }
    return "https://api.moneymatters.kaesava.au";
  }

  // Deduplicate concurrent health probes in dev so parallel tRPC calls don't stampede /health
  const now = Date.now();
  if (cachedActiveBase && now - lastProbeTime < DEV_PROBE_CACHE_TTL_MS) {
    return cachedActiveBase;
  }

  if (!inFlightProbe) {
    inFlightProbe = probeDevApiBase().finally(() => {
      inFlightProbe = null;
    });
  }
  return inFlightProbe;
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

  return true;
}

async function handleProxy(req: NextRequest) {
  let targetUrl = "";
  try {
    const isStateChanging = !["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase());
    if (isStateChanging && !isValidOrigin(req)) {
      return new Response(JSON.stringify({ error: "CSRF validation failed: Invalid Origin or Referer" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/api\/trpc/, "");
    const apiBase = await resolveApiBase();
    targetUrl = `${apiBase}/trpc${path}${url.search}`;

    if (process.env.NODE_ENV === "development") {
      if (process.env.NODE_ENV === "development") console.log(`[DEBUG tRPC Proxy] Forwarding ${req.method} to ${targetUrl} (Cookie present: ${req.headers.has("cookie")})`);
    }

    const headers = buildTrpcProxyHeaders(req.headers, {
      appId: process.env.NEXT_PUBLIC_APP_ID || DEFAULT_APP_ID,
      apiBaseUrl: apiBase,
    });
    // Copy incoming headers, filtering out forwarding headers that mess up origin matching
    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        !lowerKey.startsWith("x-forwarded-") && 
        lowerKey !== "host" && 
        lowerKey !== "forwarded"
      ) {
        headers.set(key, value);
      }
    });
    if (!headers.get("x-app-id")) {
      headers.set("x-app-id", process.env.NEXT_PUBLIC_APP_ID || DEFAULT_APP_ID);
    }

    // Ensure authorization header and normalized session cookies are forwarded if available
    const authHeader = req.headers.get("authorization");
    const cookieHeader = req.headers.get("cookie");
    if (cookieHeader && process.env.NODE_ENV === "development") {
      let mappedCookie = cookieHeader;
      if (mappedCookie.includes("neon-auth.session_token=") && !mappedCookie.includes("__Secure-neon-auth.session_token=")) {
        mappedCookie = mappedCookie.replace(/neon-auth\.session_token=/g, "__Secure-neon-auth.session_token=");
      }
      if (mappedCookie.includes("better-auth.session_token=") && !mappedCookie.includes("__Secure-better-auth.session_token=")) {
        mappedCookie = mappedCookie.replace(/better-auth\.session_token=/g, "__Secure-better-auth.session_token=");
      }
      headers.set("cookie", mappedCookie);
    }

    if (authHeader) {
      headers.set("authorization", authHeader);
    } else if (cookieHeader) {
      const pairs = cookieHeader.split(";");
      const cookiePriority = [
        "__Secure-neon-auth.session_token",
        "neon-auth.session_token",
        "__Secure-better-auth.session_token",
        "better-auth.session_token",
        "neon_auth_session",
      ];
      for (const name of cookiePriority) {
        const prefix = `${name}=`;
        const hit = pairs.map((p) => p.trim()).find((p) => p.startsWith(prefix));
        if (hit) {
          headers.set("authorization", `Bearer ${decodeURIComponent(hit.slice(prefix.length))}`);
          break;
        }
      }
    }
    
    // Explicitly set host to align with the target endpoint
    const targetHost = new URL(apiBase).host;
    headers.set("host", targetHost);

    const options: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(15000),
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = await req.text();
    }

    const response = await fetch(targetUrl, options);
    const buffer = await response.arrayBuffer();
    
    // Forward the headers, removing compression and transport headers
    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (
        lowerKey !== "transfer-encoding" && 
        lowerKey !== "content-encoding" && 
        lowerKey !== "content-length"
      ) {
        if (lowerKey === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    return new Response(buffer, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    const isConnRefused = err && typeof err === "object" && "cause" in err && (err as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED";
    if (isConnRefused) {
      cachedActiveBase = null;
      lastProbeTime = 0;
      console.warn(`[tRPC Proxy] Backend API server unavailable at ${targetUrl.split("/trpc")[0]} (ECONNREFUSED). Make sure apps/api is running.`);
    } else {
      console.error("[tRPC Proxy Error]:", err);
    }
    return new Response(JSON.stringify({ error: "Backend service unavailable" }), {
      status: 502,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}
