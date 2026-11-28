import { z } from "zod";
import type { DbOrTx } from "@kaesava/db/rings/capabilities";
import {
  CreateTenantCommand,
  GetInviteDetailsInputSchema,
  UpdateHouseholdMemberRoleCommand,
  type DataExportContributor,
  type TenantLifecycleHooks,
} from "@kaesava/types";
import {
  acceptInviteHandler,
  cancelSetupHandler,
  createTenantHandler,
  deleteMyAccountHandler,
  exportDataHandler,
  getHouseholdGovernanceInfoHandler,
  getInviteDetailsHandler,
  getTenantHandler,
  getUserPreferencesHandler,
  getUserProfileHandler,
  invitePartnerHandler,
  leaveTenantHandler,
  removeHouseholdMemberHandler,
  updateHouseholdHandler,
  updateHouseholdMemberRoleHandler,
  updateUserPreferencesHandler,
  updateUserProfileHandler,
} from "../index.js";

export interface TenantProcedureContext {
  db: DbOrTx;
  userId?: string;
  tenantId?: string | null;
  appId?: string;
  email?: string | null;
  displayName?: string | null;
}

export interface TenantProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: TenantProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: TenantProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: TenantProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: TenantProcedureContext }) => Promise<TOut>): TProc;
}

export interface CreateTenantRouterDeps<TProc> {
  publicProcedure: TenantProcedureBuilder<TProc>;
  authenticatedProcedure: TenantProcedureBuilder<TProc>;
  tenantProcedure: TenantProcedureBuilder<TProc>;
  ownerProcedure: TenantProcedureBuilder<TProc>;
  hooks?: TenantLifecycleHooks<DbOrTx>;
  exportContributors?: readonly DataExportContributor<DbOrTx>[];
  deleteFileFromBucket?: (fileKey: string) => Promise<boolean>;
}

const inviteMemberInput = z.object({
  email: z.string().email(),
  role: z.enum(["MEMBER", "VIEWER"]).optional(),
  appRole: z.string().max(50).nullable().optional(),
}).strict();

const acceptInviteInput = z.object({ inviteToken: z.string().min(1) }).strict();

const removeMemberInput = z.object({
  targetUserId: z.string().uuid().optional(),
  memberId: z.string().uuid().optional(),
}).strict();

const updateTenantInput = z.object({
  name: z.string().min(1).max(120),
  country: z.string().max(10).optional(),
  currency: z.string().max(10).optional(),
  timezone: z.string().max(100).optional(),
  state: z.string().max(50).optional(),
  postcode: z.string().max(20).optional(),
}).strict();

const updateProfileInput = z.object({
  displayName: z.string().min(1).max(120),
  notificationEmail: z.string().email(),
  phoneCountryCode: z.string().max(10).optional(),
  phoneNumber: z.string().max(30).optional(),
  avatarUrl: z.string().nullable().optional(),
}).strict();

const updatePreferencesInput = z.object({
  timezone: z.string().max(100).optional(),
  language: z.literal("en").optional(),
  showIcons: z.boolean().optional(),
  telemetryConsent: z.enum(["granted", "denied"]).optional(),
  hideAmountsInNotifications: z.boolean().optional(),
  setupCompleted: z.boolean().optional(),
  appPreferences: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
}).strict();

const restoreArchivedInput = z.object({
  itemId: z.string().uuid(),
  itemType: z.string().optional(),
}).strict();

function requireTenantCtx(ctx: TenantProcedureContext) {
  if (!ctx.tenantId || !ctx.userId || !ctx.appId) {
    throw new Error("Tenant context (tenantId, userId, appId) is required.");
  }
  return { db: ctx.db, tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId, email: ctx.email ?? "" };
}

/**
 * Adapter-driven composable tenant router factory.
 * Keeps Ring 2 free of direct `@trpc/server` imports while supporting app-specific lifecycle hooks.
 */
export function createTenantRouter<TProc>(deps: CreateTenantRouterDeps<TProc>) {
  return {
    createTenant: deps.authenticatedProcedure
      .input(CreateTenantCommand)
      .mutation(async ({ ctx, input }) =>
        createTenantHandler(ctx.db, deps.hooks)(
          input,
          ctx.appId ?? "",
          ctx.userId ?? "",
          ctx.email ?? undefined,
          ctx.displayName ?? undefined
        )
      ),
    getTenant: deps.tenantProcedure.query(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return getTenantHandler(tCtx.db, deps.hooks)(tCtx.tenantId, tCtx.appId);
    }),
    cancelSetup: deps.tenantProcedure.mutation(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return cancelSetupHandler(tCtx.db, deps.hooks)(tCtx.tenantId, tCtx.appId, tCtx.userId);
    }),
    getGovernanceInfo: deps.tenantProcedure.query(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return getHouseholdGovernanceInfoHandler(tCtx.tenantId, tCtx.userId, tCtx.db);
    }),
    updateTenant: deps.ownerProcedure.input(updateTenantInput).mutation(async ({ ctx, input }) => {
      const tCtx = requireTenantCtx(ctx);
      return updateHouseholdHandler(input, tCtx.tenantId, tCtx.userId, tCtx.db);
    }),
    inviteMember: deps.ownerProcedure.input(inviteMemberInput).mutation(async ({ ctx, input }) => {
      const tCtx = requireTenantCtx(ctx);
      return invitePartnerHandler(tCtx.db, deps.hooks)(input, tCtx.tenantId, tCtx.userId);
    }),
    getInviteDetails: deps.publicProcedure
      .input(GetInviteDetailsInputSchema)
      .query(async ({ ctx, input }) => getInviteDetailsHandler(ctx.db)(input, ctx.email ?? undefined)),
    acceptInvite: deps.authenticatedProcedure
      .input(acceptInviteInput)
      .mutation(async ({ ctx, input }) =>
        acceptInviteHandler(ctx.db, deps.hooks)(input, ctx.userId ?? "", ctx.email ?? undefined)
      ),
    updateMemberRole: deps.ownerProcedure
      .input(UpdateHouseholdMemberRoleCommand)
      .mutation(async ({ ctx, input }) => {
        const tCtx = requireTenantCtx(ctx);
        return updateHouseholdMemberRoleHandler(tCtx.db)(input, tCtx.tenantId, tCtx.userId);
      }),
    removeMember: deps.ownerProcedure.input(removeMemberInput).mutation(async ({ ctx, input }) => {
      const tCtx = requireTenantCtx(ctx);
      return removeHouseholdMemberHandler(input, tCtx.tenantId, tCtx.userId, tCtx.db, deps.hooks);
    }),
    leaveTenant: deps.tenantProcedure.mutation(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return leaveTenantHandler(tCtx.db, deps.hooks)(tCtx.tenantId, tCtx.userId, tCtx.email, tCtx.appId);
    }),
    deleteMyAccount: deps.ownerProcedure.mutation(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return deleteMyAccountHandler(tCtx.db, deps.deleteFileFromBucket, deps.hooks)(
        tCtx.tenantId,
        tCtx.userId,
        tCtx.email,
        tCtx.appId
      );
    }),
    exportData: deps.tenantProcedure.query(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return exportDataHandler(tCtx.db, undefined, deps.hooks, deps.exportContributors)(
        tCtx.tenantId,
        tCtx.userId,
        tCtx.appId
      );
    }),
    getUserProfile: deps.authenticatedProcedure.query(async ({ ctx }) =>
      getUserProfileHandler(ctx.userId ?? "", ctx.tenantId, ctx.db)
    ),
    updateUserProfile: deps.authenticatedProcedure
      .input(updateProfileInput)
      .mutation(async ({ ctx, input }) => updateUserProfileHandler(input, ctx.userId ?? "", ctx.db)),
    getUserPreferences: deps.tenantProcedure.query(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return getUserPreferencesHandler(tCtx.userId, tCtx.tenantId, tCtx.appId, tCtx.db);
    }),
    updateUserPreferences: deps.tenantProcedure
      .input(updatePreferencesInput)
      .mutation(async ({ ctx, input }) => {
        const tCtx = requireTenantCtx(ctx);
        return updateUserPreferencesHandler(input, tCtx.userId, tCtx.tenantId, tCtx.appId, tCtx.db);
      }),
    listArchivedItems: deps.tenantProcedure.query(async ({ ctx }) => {
      const tCtx = requireTenantCtx(ctx);
      return deps.hooks?.onListArchivedItems ? deps.hooks.onListArchivedItems(tCtx) : [];
    }),
    restoreArchivedItem: deps.tenantProcedure.input(restoreArchivedInput).mutation(async ({ ctx, input }) => {
      const tCtx = requireTenantCtx(ctx);
      return deps.hooks?.onRestoreArchivedItem
        ? deps.hooks.onRestoreArchivedItem({ ...tCtx, itemId: input.itemId, itemType: input.itemType })
        : { success: false };
    }),
  };
}

export const tenantProcedures = {
  createTenant: { execute: createTenantHandler },
  getTenant: { execute: getTenantHandler },
  cancelSetup: { execute: cancelSetupHandler },
  invitePartner: { execute: invitePartnerHandler },
  acceptInvite: { execute: acceptInviteHandler },
  exportData: { execute: exportDataHandler },
  deleteMyAccount: { execute: deleteMyAccountHandler },
} as const;
