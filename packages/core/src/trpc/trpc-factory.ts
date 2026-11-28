import {
  initTRPC,
  TRPCError,
  type TRPCProcedureBuilder,
  type TRPCRootObject,
  type TRPCUnsetMarker,
  type TRPCDefaultErrorShape,
} from "@trpc/server";
import { sql } from "drizzle-orm";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import type { DbClient, DbOrTx, DbTransaction } from "@kaesava/db/rings/platform";
import type { SubscriptionStatusDto } from "@kaesava/types";
import { canRolePerform } from "../guards/rbac.js";
import { logger } from "../logger.js";

export interface PlatformTrpcSession {
  userId: string;
  email: string;
  displayName?: string;
  tenantId: string | null;
  appId: string;
  role: string | null;
  appRole?: string | null;
}

export interface PlatformTrpcContext {
  db: DbClient;
  session: PlatformTrpcSession | null;
  userId: string | null;
  tenantId: string | null;
  appId: string | null;
  email: string | null;
  correlationId: string;
}

export interface WriteAccessDecision {
  allowed: boolean;
  reason?: string;
  message?: string;
}

export interface PlatformTrpcDependencies {
  getSubscriptionStatus: (db: DbOrTx, tenantId: string) => Promise<SubscriptionStatusDto>;
  evaluateSubscriptionWriteAccess: (ctx: {
    isReadOnly?: boolean;
    role?: string | null;
  }) => WriteAccessDecision;
}

export interface TenantContextOverrides {
  db: DbTransaction;
  tenantId: string;
  appId: string;
  userId: string;
  subscriptionStatus: SubscriptionStatusDto;
}

export type PlatformProcedureBuilder<TOverrides extends object = object> = TRPCProcedureBuilder<
  PlatformTrpcContext,
  object,
  TOverrides,
  TRPCUnsetMarker,
  TRPCUnsetMarker,
  TRPCUnsetMarker,
  TRPCUnsetMarker,
  false
>;

export interface PlatformTrpcResult {
  router: TRPCRootObject<
    PlatformTrpcContext,
    object,
    object,
    { ctx: PlatformTrpcContext; meta: object; errorShape: TRPCDefaultErrorShape; transformer: false }
  >["router"];
  publicProcedure: PlatformProcedureBuilder;
  authenticatedProcedure: PlatformProcedureBuilder<{ userId: string; email: string }>;
  tenantProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  privateTenantProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  ownerProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  privateOwnerProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  memberWriteProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  privateMemberWriteProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  premiumProcedure: PlatformProcedureBuilder<TenantContextOverrides>;
  requiresWriteAccess: (ctx: {
    subscriptionStatus: SubscriptionStatusDto;
    session?: { role?: string | null } | null;
  }) => void;
}

const DB_ERROR_PATTERN =
  /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"/i;

function formatTrpcError(code: string, message: string, cause: unknown, stack: string | undefined) {
  const isInternalOrDbError = code === "INTERNAL_SERVER_ERROR" || DB_ERROR_PATTERN.test(message);
  if (isInternalOrDbError) {
    logger.error("[API Error Intercepted]", {
      code,
      message,
      stack: cause instanceof Error ? cause.stack : stack,
    });
  }
  return {
    safeMessage: isInternalOrDbError
      ? "Something went wrong while processing your request. Please try again."
      : message,
    stack: process.env.NODE_ENV === "production" ? undefined : stack,
  };
}

function assertTenantContext(ctx: PlatformTrpcContext) {
  if (!ctx.session || !ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message:
        "Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.",
    });
  }
  return { tenantId: ctx.tenantId, appId: ctx.appId, userId: ctx.userId };
}

function assertOwnerRole(role: string | null | undefined) {
  if (role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only the household owner has permission to perform this action.",
    });
  }
}

function assertWriteRole(role: string | null | undefined) {
  if (!canRolePerform(role, "write")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewer members have read-only access.",
    });
  }
}

/**
 * Creates a parameterized tRPC instance with standard platform auth, RLS, RBAC, and subscription procedures.
 */
export function createPlatformTrpc(deps: PlatformTrpcDependencies): PlatformTrpcResult {
  const t = initTRPC.context<PlatformTrpcContext>().create({
    errorFormatter({ shape, error }) {
      const formatted = formatTrpcError(error.code, error.message, error.cause, shape.data.stack);
      const data = { ...shape.data };
      if (process.env.NODE_ENV === "production") {
        delete data.stack;
      }
      return {
        ...shape,
        message: formatted.safeMessage,
        data,
      };
    },
  });

  const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.session?.userId) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required." });
    }
    return next({ ctx: { ...ctx, userId: ctx.session.userId, email: ctx.session.email } });
  });

  function buildTenantProcedure(includeUserRls: boolean) {
    return t.procedure.use(async ({ ctx, next }) => {
      const { tenantId, appId, userId } = assertTenantContext(ctx);
      return ctx.db.transaction(async (tx) => {
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
        if (includeUserRls) {
          await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);
        }
        const subscriptionStatus = await deps.getSubscriptionStatus(tx, tenantId);
        if (subscriptionStatus.isDeactivated) {
          const tenantLabel = resolveAppConfigOrDefault(appId).terminology.tenantSingular;
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `subscription_deactivated: ${tenantLabel} account access is paused.`,
          });
        }
        return next({ ctx: { ...ctx, db: tx, tenantId, appId, userId, subscriptionStatus } });
      });
    });
  }

  const tenantProcedure = buildTenantProcedure(false);
  const privateTenantProcedure = buildTenantProcedure(true);

  const ownerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
    assertOwnerRole(ctx.session?.role);
    return next({ ctx: { ...ctx, tenantId: ctx.tenantId, appId: ctx.appId, userId: ctx.userId } });
  });

  const privateOwnerProcedure = privateTenantProcedure.use(async ({ ctx, next }) => {
    assertOwnerRole(ctx.session?.role);
    return next({ ctx: { ...ctx, tenantId: ctx.tenantId, appId: ctx.appId, userId: ctx.userId } });
  });

  const memberWriteProcedure = tenantProcedure.use(async ({ ctx, next }) => {
    assertWriteRole(ctx.session?.role);
    return next();
  });

  const privateMemberWriteProcedure = privateTenantProcedure.use(async ({ ctx, next }) => {
    assertWriteRole(ctx.session?.role);
    return next();
  });

  const premiumProcedure = tenantProcedure.use(async ({ ctx, next }) => {
    if (ctx.subscriptionStatus.isTrialExpired || ctx.subscriptionStatus.isDeactivated) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "subscription_premium_required: Active subscription or unexpired 60-day trial required.",
      });
    }
    return next();
  });

  function requiresWriteAccess(ctx: {
    subscriptionStatus: SubscriptionStatusDto;
    session?: { role?: string | null } | null;
  }) {
    const isReadOnly =
      ctx.subscriptionStatus.isTrialExpired ||
      ctx.subscriptionStatus.isGracePeriod ||
      ctx.subscriptionStatus.isPastDue ||
      ctx.subscriptionStatus.isDeactivated;
    const decision = deps.evaluateSubscriptionWriteAccess({ isReadOnly, role: ctx.session?.role });
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

  return {
    router: t.router,
    publicProcedure: t.procedure,
    authenticatedProcedure,
    tenantProcedure,
    privateTenantProcedure,
    ownerProcedure,
    privateOwnerProcedure,
    memberWriteProcedure,
    privateMemberWriteProcedure,
    premiumProcedure,
    requiresWriteAccess,
  };
}
