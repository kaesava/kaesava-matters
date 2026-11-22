import { initTRPC, TRPCError } from '@trpc/server';
import type { EdgeContext as Context } from './edge-context.js';

import { sql } from 'drizzle-orm';
import { logger, canRolePerform } from '@money-matters/core';
import { resolveAppConfigOrDefault } from '@money-matters/config';
import { getSubscriptionStatus, evaluateSubscriptionWriteAccess } from '@money-matters/capability-billing';
import type { SubscriptionStatusDto } from '@money-matters/types';

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    const isInternalOrDbError =
      error.code === 'INTERNAL_SERVER_ERROR' ||
      /violates.*constraint|foreign key|syntax error|relation.*does not exist|table ".*"|column ".*"/i.test(error.message);

    if (isInternalOrDbError) {
      logger.error('[API Error Intercepted]', {
        code: error.code,
        message: error.message,
        stack: error.cause instanceof Error ? error.cause.stack : error.stack,
      });
    }

    const safeMessage = isInternalOrDbError
      ? 'Something went wrong while processing your request. Please try again.'
      : error.message;

    return {
      ...shape,
      message: safeMessage,
      data: {
        ...shape.data,
        stack: process.env.NODE_ENV === 'production' ? undefined : shape.data.stack,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Requires a verified Neon Auth JWT but does NOT require an active tenant.
 * Use for sign-up flows and onboarding endpoints where a tenant doesn't exist yet.
 */
export const authenticatedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.session.userId,
      email: ctx.session.email,
    },
  });
});

/**
 * Requires a verified JWT AND an active tenant membership.
 * Enforces tenant isolation: all queries must be scoped to ctx.tenantId.
 * Enforces PostgreSQL RLS by setting session variable inside transaction.
 * Resolves subscriptionStatus and gates DEACTIVATED tenants.
 */
export const tenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.',
    });
  }

  const tenantId = ctx.tenantId;
  const appId = ctx.appId;
  const userId = ctx.userId;

  // Wrap the call in a database transaction to scope the SET LOCAL session setting.
  return await ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);

    const subscriptionStatus = await getSubscriptionStatus(tx, tenantId);

    if (subscriptionStatus.isDeactivated) {
      const tenantLabel = resolveAppConfigOrDefault(appId).terminology.tenantSingular;
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: `subscription_deactivated: ${tenantLabel} account access is paused.`,
      });
    }

    return next({
      ctx: {
        ...ctx,
        db: tx, // transactional database client with RLS active
        tenantId,
        appId,
        userId,
        subscriptionStatus,
      },
    });
  });
});

/**
 * Requires a verified JWT AND active tenant membership.
 * Enforces BOTH tenant isolation AND Stealth Privacy RLS by setting
 * app.current_tenant_id and app.current_user_id session variables in the transaction context.
 * Use for procedures accessing categories, bank_accounts, or transactions with potential stealth privacy flags.
 */
export const privateTenantProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session || !ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Multi-tenancy boundary isolation violation: Missing or invalid verified session tracking parameters.',
    });
  }

  const tenantId = ctx.tenantId;
  const appId = ctx.appId;
  const userId = ctx.userId;

  return await ctx.db.transaction(async (tx) => {
    await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
    await tx.execute(sql`SELECT set_config('app.current_user_id', ${userId}, true)`);

    const subscriptionStatus = await getSubscriptionStatus(tx, tenantId);

    if (subscriptionStatus.isDeactivated) {
      const tenantLabel = resolveAppConfigOrDefault(appId).terminology.tenantSingular;
      throw new TRPCError({
        code: 'FORBIDDEN',
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
        subscriptionStatus,
      },
    });
  });
});

export const ownerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.session?.role !== 'OWNER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the household owner has permission to perform this action.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      userId: ctx.userId,
    },
  });
});

export const privateOwnerProcedure = privateTenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.session?.role !== 'OWNER') {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Only the household owner has permission to perform this action.',
    });
  }
  return next({
    ctx: {
      ...ctx,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      userId: ctx.userId,
    },
  });
});

export const memberWriteProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (!canRolePerform(ctx.session?.role, 'write')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Viewer members have read-only access.',
    });
  }
  return next();
});

export const privateMemberWriteProcedure = privateTenantProcedure.use(async ({ ctx, next }) => {
  if (!canRolePerform(ctx.session?.role, 'write')) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Viewer members have read-only access.',
    });
  }
  return next();
});

/**
 * Throws TRPCError FORBIDDEN if tenant's trial has ended, is in read-only grace period, past due, or deactivated.
 */
export function requiresWriteAccess(ctx: { subscriptionStatus: SubscriptionStatusDto; session?: { role?: string | null } | null }) {
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
      code: 'FORBIDDEN',
      message:
        decision.reason === 'READ_ONLY_SUBSCRIPTION'
          ? 'Your account is currently read-only. Please update your billing details to resume making changes.'
          : decision.message || 'Write access forbidden.',
    });
  }
}


/**
 * Requires an active trial or paid subscription.
 * Rejects TRIAL_EXPIRED or DEACTIVATED tenants.
 */
export const premiumProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.subscriptionStatus.isTrialExpired || ctx.subscriptionStatus.isDeactivated) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'subscription_premium_required: Active subscription or unexpired 60-day trial required.',
    });
  }
  return next();
});


