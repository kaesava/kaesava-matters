import { createPiiSafeLogger } from "@kaesava/types";

export { redactPii, formatLog, type LogLevel } from "@kaesava/types";

export const logger = createPiiSafeLogger(() => process.env.NODE_ENV !== "production");

/** Structured audit logging helper for security-critical events. */
export function logAuditEvent(
  action: string,
  tenantId: string,
  userId: string,
  meta?: Record<string, unknown>
): void {
  logger.info(`[AUDIT_EVENT] ${action}`, {
    action,
    tenantId,
    userId,
    ...meta,
  });
}

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "x-tenant-id",
  "x-active-tenant",
]);

/**
 * Scrubs sensitive auth/tenant headers from Sentry events before dispatch.
 */
export function sanitizeSentryEvent<T extends Record<string, unknown>>(event: T): T {
  const req = event.request as { headers?: Record<string, unknown> } | undefined;
  if (!req?.headers || typeof req.headers !== "object") return event;
  const cleanHeaders: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (!SENSITIVE_HEADERS.has(k.toLowerCase())) {
      cleanHeaders[k] = v;
    }
  }
  return { ...event, request: { ...req, headers: cleanHeaders } };
}
