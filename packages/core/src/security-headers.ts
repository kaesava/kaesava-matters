/**
 * Canonical Security Headers conforming to AGENTS.md §2 and §10.
 * Enforces clickjacking prevention, MIME sniffing suppression, HSTS, and strict origin isolation.
 */
export const CANONICAL_SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const PROD_ORIGIN_REGEX = /^https:\/\/([a-z0-9-]+\.)*kaesava\.au$/;
const DEV_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/;

export function isAllowedOrigin(
  origin: string | null,
  isDev = false,
  allowedHosts?: readonly string[]
): boolean {
  if (!origin) return false;
  if (PROD_ORIGIN_REGEX.test(origin)) return true;
  if (isDev && DEV_ORIGIN_REGEX.test(origin)) return true;
  if (allowedHosts && allowedHosts.length > 0) {
    try {
      const { hostname, protocol } = new URL(origin);
      if (protocol !== "https:" && !(isDev && protocol === "http:")) return false;
      return allowedHosts.some((h) =>
        h.startsWith(".") ? hostname.endsWith(h) : hostname === h
      );
    } catch {
      return false;
    }
  }
  return false;
}

export function buildCorsHeaders(
  origin: string | null,
  isDev = false,
  allowedHosts?: readonly string[]
): Record<string, string> {
  const allowed = isAllowedOrigin(origin, isDev, allowedHosts);
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, trpc-accept, x-correlation-id, x-tenant-id, x-active-tenant, x-app-id",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };

  if (allowed && origin) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}
