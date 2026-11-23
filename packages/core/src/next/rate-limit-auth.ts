import { checkRateLimit } from "../rate-limiter.js";
import { logger } from "../logger.js";

const OTP_SEND_PATHS = new Set([
  "/email-otp/request-password-reset",
  "/email-otp/send-verification-otp",
  "/forget-password/email-otp",
  "/request-password-reset",
]);

const OTP_VERIFY_PATHS = new Set([
  "/email-otp/reset-password",
  "/email-otp/verify-email",
  "/reset-password",
]);

export interface AuthProxyRateLimitEnv {
  UPSTASH_REDIS_REST_URL?: string;
  UPSTASH_REDIS_REST_TOKEN?: string;
}

async function hashIdentifier(raw: string): Promise<string> {
  const data = new TextEncoder().encode(raw);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function extractNormalizedEmail(bodyText: string): string | null {
  if (!bodyText) return null;
  try {
    const parsed = JSON.parse(bodyText) as { email?: unknown };
    if (typeof parsed.email === "string" && parsed.email.trim().length > 0) {
      return parsed.email.trim().toLowerCase();
    }
  } catch {
    // Ignore non-JSON payloads
  }
  return null;
}

function tooManyRequestsResponse(retryAfterSeconds: number): Response {
  const message = "Too many authentication requests. Please try again shortly.";
  return new Response(JSON.stringify({ error: message, message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}

export async function enforceAuthProxyRateLimit(
  path: string,
  clientIp: string,
  bodyText: string,
  env?: AuthProxyRateLimitEnv
): Promise<Response | null> {
  if (OTP_SEND_PATHS.has(path)) {
    const ipCheck = await checkRateLimit(`auth:otp-ip:${clientIp}`, 5, 900, env);
    if (!ipCheck.allowed) {
      logger.warn("[Auth Proxy] OTP send IP rate limit triggered", { path });
      return tooManyRequestsResponse(900);
    }

    const email = extractNormalizedEmail(bodyText);
    if (email) {
      const emailHash = await hashIdentifier(email);
      const emailCheck = await checkRateLimit(`auth:otp-email:${emailHash}`, 3, 900, env);
      if (!emailCheck.allowed) {
        logger.warn("[Auth Proxy] OTP send email rate limit triggered", { path });
        return tooManyRequestsResponse(900);
      }
    }
    return null;
  }

  if (OTP_VERIFY_PATHS.has(path)) {
    const verifyCheck = await checkRateLimit(`reset-password:${clientIp}`, 10, 900, env);
    if (!verifyCheck.allowed) {
      logger.warn("[Auth Proxy] OTP verification rate limit triggered", { path });
      return tooManyRequestsResponse(900);
    }
    return null;
  }

  const generalCheck = await checkRateLimit(`auth:${clientIp}`, 30, 60, env);
  if (!generalCheck.allowed) {
    logger.warn("[Auth Proxy] General auth rate limit triggered", { path });
    return tooManyRequestsResponse(60);
  }

  return null;
}
