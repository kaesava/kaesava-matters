import { createPiiSafeLogger } from "@money-matters/types";

export { redactPii, formatLog, type LogLevel } from "@money-matters/types";

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
