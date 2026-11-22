import { checkRateLimit } from "./rate-limiter.js";

async function hashKey(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

export interface ApiRateLimitOptions {
  appId?: string;
  exemptPaths?: readonly string[];
  exemptPrefixes?: readonly string[];
  defaultLimitPerMinute?: number;
  resetPasswordLimitPerMinute?: number;
}

const DEFAULT_EXEMPT_PATHS = ["/webhooks/stripe"] as const;
const DEFAULT_EXEMPT_PREFIXES = ["/api/inngest"] as const;

export async function enforceApiRateLimit(
  request: Request,
  url: URL,
  baseHeaders: Record<string, string>,
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string },
  options?: ApiRateLimitOptions
): Promise<Response | null> {
  const exemptPaths = options?.exemptPaths ?? DEFAULT_EXEMPT_PATHS;
  const exemptPrefixes = options?.exemptPrefixes ?? DEFAULT_EXEMPT_PREFIXES;

  if (
    exemptPaths.includes(url.pathname) ||
    exemptPrefixes.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return null;
  }

  const clientIp =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown-ip";

  const appScope = options?.appId || request.headers.get("x-app-id") || "global";
  const isResetPassword = url.pathname === "/reset-password";
  const authHeader = request.headers.get("authorization");
  let rateLimitKey = isResetPassword ? `reset-password:${appScope}:${clientIp}` : `${appScope}:ip:${clientIp}`;

  if (authHeader && !isResetPassword) {
    const hashed = await hashKey(authHeader);
    rateLimitKey = `${appScope}:api:${hashed}`;
  }

  const limit = isResetPassword
    ? (options?.resetPasswordLimitPerMinute ?? 10)
    : (options?.defaultLimitPerMinute ?? 120);
  const { allowed } = await checkRateLimit(rateLimitKey, limit, 60, env);

  if (!allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again in a minute." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          ...baseHeaders,
        },
      }
    );
  }

  return null;
}
