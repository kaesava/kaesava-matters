import { z } from "zod";
import { eq } from "drizzle-orm";
import { tenants, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  CompleteBusinessSetupInput,
  UpdateBusinessProfileInput,
  UpsertTeamMemberProfileInput,
} from "../business/schemas.js";
import { getBusinessProfileQuery, listTeamMembersWithRatesQuery } from "../business/queries.js";
import {
  completeBusinessSetupCommand,
  updateBusinessProfileCommand,
  upsertTeamMemberProfileCommand,
} from "../business/commands.js";
import { canManageBusiness, canManageTeam } from "../rbac/policy.js";
import { countTenantSeats, resolveTierSeatLimits } from "../rbac/entitlements.js";

export interface BusinessProcedureContext {
  db: DbOrTx;
  tenantId?: string | null;
  appId?: string;
  userId?: string;
  role?: string | null;
  appRole?: string | null;
}

export interface BusinessProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: BusinessProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: BusinessProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: BusinessProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: BusinessProcedureContext }) => Promise<TOut>): TProc;
}

export interface CreateBusinessRouterDeps<TProc> {
  tenantProcedure: BusinessProcedureBuilder<TProc>;
}

function requireCtx(ctx: BusinessProcedureContext) {
  if (!ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new Error("Tenant context (tenantId, appId, userId) is required.");
  }
  return {
    db: ctx.db,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    userId: ctx.userId,
    role: ctx.role ?? null,
    appRole: ctx.appRole ?? null,
  };
}

export function createBusinessRouter<TProc>(deps: CreateBusinessRouterDeps<TProc>) {
  return {
    getBusinessProfile: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      return getBusinessProfileQuery(c.db, c.tenantId, c.appId);
    }),

    completeBusinessSetup: deps.tenantProcedure
      .input(CompleteBusinessSetupInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireCtx(ctx);
        if (!canManageBusiness(c.role, c.appRole)) {
          throw new Error("Insufficient permissions to complete business setup.");
        }
        return completeBusinessSetupCommand(c.db, c, input);
      }),

    updateBusinessProfile: deps.tenantProcedure
      .input(UpdateBusinessProfileInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireCtx(ctx);
        if (!canManageBusiness(c.role, c.appRole)) {
          throw new Error("Insufficient permissions to update business profile.");
        }
        return updateBusinessProfileCommand(c.db, c, input);
      }),

    listTeamMembersWithRates: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      return listTeamMembersWithRatesQuery(c.db, {
        tenantId: c.tenantId,
        appId: c.appId,
        callerBaseRole: c.role,
        callerAppRole: c.appRole,
      });
    }),

    upsertTeamMemberProfile: deps.tenantProcedure
      .input(UpsertTeamMemberProfileInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireCtx(ctx);
        if (!canManageTeam(c.role, c.appRole) && input.userId !== c.userId) {
          throw new Error("Insufficient permissions to update team member profile.");
        }
        return upsertTeamMemberProfileCommand(
          c.db,
          { tenantId: c.tenantId, appId: c.appId, actorUserId: c.userId },
          input
        );
      }),

    getSeatEntitlements: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      const [tenant] = await c.db
        .select({ planType: tenants.planType, subscriptionStatus: tenants.subscriptionStatus })
        .from(tenants)
        .where(eq(tenants.id, c.tenantId))
        .limit(1);
      const counts = await countTenantSeats(c.db, c.tenantId);
      const limits = resolveTierSeatLimits(tenant?.planType);
      return {
        planType: tenant?.planType ?? "TRIAL",
        subscriptionStatus: tenant?.subscriptionStatus ?? "TRIAL",
        ...counts,
        ...limits,
      };
    }),
  };
}

export type {
  CreateTradieRouterDeps,
  TradieProcedureBuilder,
  TradieProcedureContext,
} from "./context.js";
export { createCustomersRouter, createSitesRouter } from "./crm.js";
export { createPricebookRouter } from "./pricebook.js";
export { createJobsRouter } from "./jobs.js";
export { createDispatchRouter } from "./dispatch.js";
export { createFieldRouter } from "./field.js";
export { createQuotesRouter, createPortalQuoteRouter } from "./quotes.js";
export { createInvoicesRouter, createPortalInvoiceRouter } from "./invoices.js";
export { createTimesheetsRouter, createActivityRouter, createPulseRouter } from "./pulse.js";
