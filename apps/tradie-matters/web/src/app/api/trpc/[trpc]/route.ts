import { NextRequest } from "next/server";
import { buildTrpcProxyHeaders } from "@kaesava/core/next";

const TRADIE_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";
const DEV_PROBE_TIMEOUT_MS = 3000;
const DEV_PROBE_CACHE_TTL_MS = 60_000;

let cachedActiveBase: string | null = null;
let lastProbeTime = 0;
let inFlightProbe: Promise<string> | null = null;

export async function GET(req: NextRequest) {
  return handleProxy(req);
}

export async function POST(req: NextRequest) {
  return handleProxy(req);
}

export async function PUT(req: NextRequest) {
  return handleProxy(req);
}

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
  if (customUrl && !customUrl.includes("tradiematters.kaesava.au")) {
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

  for (const port of [3011, 8787, 3001]) {
    const candidate = `http://127.0.0.1:${port}`;
    if (await probeHealth(candidate)) {
      cachedActiveBase = candidate;
      lastProbeTime = Date.now();
      return cachedActiveBase;
    }
  }

  return "http://127.0.0.1:3011";
}

async function resolveApiBase(): Promise<string> {
  if (process.env.NODE_ENV !== "development") {
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      return envUrl.trim().replace(/\/+$/, "").replace(/\/trpc$/, "");
    }
    return "https://api.tradiematters.kaesava.au";
  }

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
    "https://tradiematters.kaesava.au",
    "https://api.tradiematters.kaesava.au",
    ...(process.env.NODE_ENV !== "production"
      ? [
          "http://localhost:3010",
          "http://127.0.0.1:3010",
          "http://localhost:3011",
          "http://127.0.0.1:3011",
          "http://localhost:8787",
          "http://127.0.0.1:8787",
        ]
      : []),
  ];

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

    const headers = buildTrpcProxyHeaders(req.headers, {
      appId: process.env.NEXT_PUBLIC_APP_ID || TRADIE_APP_ID,
      apiBaseUrl: apiBase,
    });

    req.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!lowerKey.startsWith("x-forwarded-") && lowerKey !== "host" && lowerKey !== "forwarded") {
        headers.set(key, value);
      }
    });
    if (!headers.get("x-app-id")) {
      headers.set("x-app-id", process.env.NEXT_PUBLIC_APP_ID || TRADIE_APP_ID);
    }

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

    headers.set("host", new URL(apiBase).host);

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

    const responseHeaders = new Headers();
    response.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== "transfer-encoding" && lowerKey !== "content-encoding" && lowerKey !== "content-length") {
        if (lowerKey === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    });

    return new Response(buffer, { status: response.status, headers: responseHeaders });
  } catch (err: unknown) {
    const isConnRefused =
      err && typeof err === "object" && "cause" in err && (err as { cause?: { code?: string } }).cause?.code === "ECONNREFUSED";
    if (isConnRefused) {
      cachedActiveBase = null;
      lastProbeTime = 0;
    }
    return new Response(JSON.stringify({ error: "Backend service unavailable" }), {
      status: 502,
      headers: { "Content-Type": "application/json" },
    });
  }
}
