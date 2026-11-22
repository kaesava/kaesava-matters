export interface SubscriptionWriteAccessContext {
  isReadOnly?: boolean;
  role?: string | null;
}

export interface WriteAccessDecision {
  allowed: boolean;
  reason?: "READ_ONLY_SUBSCRIPTION" | "VIEWER_ROLE";
  message?: string;
}

/**
 * Ring 2 Billing & RBAC write-access evaluator.
 * Enforces trial freeze-out / read-only grace period and viewer-role restrictions.
 */
export function evaluateSubscriptionWriteAccess(
  ctx: SubscriptionWriteAccessContext
): WriteAccessDecision {
  if (ctx.isReadOnly) {
    return {
      allowed: false,
      reason: "READ_ONLY_SUBSCRIPTION",
      message:
        "Your trial or subscription has ended. Your account is in read-only mode — upgrade to make changes.",
    };
  }
  if (ctx.role === "VIEWER") {
    return {
      allowed: false,
      reason: "VIEWER_ROLE",
      message: "View-only members cannot modify workspace data.",
    };
  }
  return { allowed: true };
}
