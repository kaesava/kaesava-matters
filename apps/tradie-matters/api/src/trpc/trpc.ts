import { initTRPC, TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import { logger, canRolePerform } from "@kaesava/core";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { getSubscriptionStatus, evaluateSubscriptionWriteAccess } from "@kaesava/capability-billing";
import type { SubscriptionStatusDto } from "@kaesava/types";
import type { EdgeContext } from "./context.js";

const t = initTRPC.context<EdgeContext>().create({
  errorFormatter({ shape, error }) {
    const isInternalOrDbError =
      error.code === "INTERNAL_SERVER_ERROR" ||
      /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"/i.test(
        error.message
      );

    if (isInternalOrDbError) {
      logger.error("[Tradie API Error Intercepted]", {
        code: error.code,
        message: error.message,
        stack: error.cause instanceof Error ? error.cause.stack : error.stack,
      });
    }

    const safeMessage = isInternalOrDbError
      ? "Something went wrong while processing your request. Please try again."
      : error.message;

    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        stack: process.env.NODE_ENV === "production" ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.session.userId,
      email: ctx.session.email,
      displayName: ctx.session.displayName ?? null,
    },
  });
});

export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Multi-tenancy boundary isolation violation: Missing or invalid session parameters.",
    });
  }

  const { tenantId, appId, userId, session } = ctx;
  return ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    const subscriptionStatus = await getSubscriptionStatus(tx, tenantId);
    if (subscriptionStatus.isDeactivated) {
      const tenantLabel = resolveAppConfigOrDefault(appId).terminology.tenantSingular;
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `subscription_deactivated: ${tenantLabel} account access is paused.`,
      });
    }
    return next({
      ctx: {
        ...ctx,
        db: tx,
        tenantId,
        appId,
        userId,
        role: session.role ?? null,
        appRole: session.appRole ?? null,
        subscriptionStatus,
      },
    });
  });
});

export const privateTenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Multi-tenancy boundary isolation violation: Missing or invalid session parameters.",
    });
  }

  const { tenantId, appId, userId, session } = ctx;
  return ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
    const subscriptionStatus = await getSubscriptionStatus(tx, tenantId);
    if (subscriptionStatus.isDeactivated) {
      const tenantLabel = resolveAppConfigOrDefault(appId).terminology.tenantSingular;
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `subscription_deactivated: ${tenantLabel} account access is paused.`,
      });
    }
    return next({
      ctx: {
        ...ctx,
        db: tx,
        tenantId,
        appId,
        userId,
        role: session.role ?? null,
        appRole: session.appRole ?? null,
        subscriptionStatus,
      },
    });
  });
});

export const ownerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.session?.role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the business owner has permission to perform this action.",
    });
  }
  return next({ ctx });
});

export const memberWriteProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (!canRolePerform(ctx.session?.role, "write")) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Viewer members have read-only access." });
  }
  return next();
});

export function requiresWriteAccess(ctx: {
  subscriptionStatus: SubscriptionStatusDto;
  session?: { role?: string | null } | null;
}) {
  const isReadOnly =
    ctx.subscriptionStatus.isTrialExpired ||
    ctx.subscriptionStatus.isGracePeriod ||
    ctx.subscriptionStatus.isPastDue ||
    ctx.subscriptionStatus.isDeactivated;
  const decision = evaluateSubscriptionWriteAccess({
    isReadOnly,
    role: ctx.session?.role,
  });
  if (!decision.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        decision.reason === "READ_ONLY_SUBSCRIPTION"
          ? "Your account is currently read-only. Please update your billing details to resume making changes."
          : decision.message || "Write access forbidden.",
    });
  }
}
