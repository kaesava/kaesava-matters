const COOKIE_PRIORITY = [
  "__Secure-neon-auth.session_token",
  "neon-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
  "neon_auth_session",
] as const;

export interface FileNotesProxyConfig {
  defaultDevApiUrl?: string;
}

function buildForwardHeaders(req: Request, apiBase: string): Headers {
  const headers = new Headers();
  const cookieHeader = req.headers.get("cookie");
  const authHeader = req.headers.get("authorization");
  const contentType = req.headers.get("content-type");
  const tenantId = req.headers.get("x-tenant-id");
  const appId = req.headers.get("x-app-id") || process.env.NEXT_PUBLIC_APP_ID;
  const correlationId = req.headers.get("x-correlation-id");

  if (contentType) headers.set("content-type", contentType);
  if (tenantId) headers.set("x-tenant-id", tenantId);
  if (appId) headers.set("x-app-id", appId);
  if (correlationId) headers.set("x-correlation-id", correlationId);
  if (cookieHeader) headers.set("cookie", cookieHeader);

  if (authHeader) {
    headers.set("authorization", authHeader);
  } else if (cookieHeader) {
    const pairs = cookieHeader.split(";");
    for (const name of COOKIE_PRIORITY) {
      const prefix = `${name}=`;
      const hit = pairs.map((p) => p.trim()).find((p) => p.startsWith(prefix));
      if (hit) {
        headers.set("authorization", `Bearer ${decodeURIComponent(hit.slice(prefix.length))}`);
        break;
      }
    }
  }

  headers.set("host", new URL(apiBase).host);
  return headers;
}

export function createFileNotesProxyHandlers(config?: FileNotesProxyConfig) {
  const fallbackBase = config?.defaultDevApiUrl || "http://127.0.0.1:3001";

  async function proxyFileNotes(req: Request): Promise<Response> {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || fallbackBase).replace(/\/$/, "");
    const reqUrl = new URL(req.url);
    const targetUrl = `${apiBase}${reqUrl.pathname}${reqUrl.search}`;
    const headers = buildForwardHeaders(req, apiBase);

    const options: RequestInit = {
      method: req.method,
      headers,
      signal: AbortSignal.timeout(30_000),
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body = await req.arrayBuffer();
    }

    const upstream = await fetch(targetUrl, options);
    const body = await upstream.arrayBuffer();
    const resHeaders = new Headers();
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (lower !== "transfer-encoding" && lower !== "content-encoding" && lower !== "connection") {
        resHeaders.set(key, value);
      }
    });

    return new Response(body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders,
    });
  }

  return {
    GET: (req: Request) => proxyFileNotes(req),
    PUT: (req: Request) => proxyFileNotes(req),
  };
}
