import { z } from "zod";
import { resolveTypedAppFlags } from "@kaesava/config";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  AccountingProviderSchema,
  SaveAccountingConnectionInput,
  StartAccountingOAuthInput,
  UpsertEntityLinkInput,
  disconnectAccountingCommand,
  listAccountingConnectionsQuery,
  saveAccountingConnectionCommand,
  startAccountingOAuthCommand,
  syncAccountingNowCommand,
  upsertAccountingEntityLinkCommand,
  ExtractReceiptInput,
  extractReceiptViaAiVisionQuery,
  CreatePurchaseOrderInput,
  CreateSupplierBillInput,
  createPurchaseOrderCommand,
  sendPurchaseOrderCommand,
  convertPurchaseOrderToBillCommand,
  listPurchaseOrdersQuery,
  listSupplierBillsQuery,
  createSupplierBillCommand,
  getSmsCreditBalanceQuery,
  getPhoneConfigQuery,
  savePhoneConfigCommand,
  SavePhoneConfigInput,
  listSmsThreadsQuery,
  listSmsMessagesQuery,
  sendSmsReplyCommand,
  SendSmsReplyInput,
  SendOnMyWaySmsInput,
  sendOnMyWaySmsCommand,
  SendReviewBoosterInput,
  sendReviewBoosterCommand,
  getReviewRequestByTokenQuery,
  SubmitSatisfactionInput,
  submitCustomerSatisfactionCommand,
  type AccountingOAuthEnv,
  type AiGatewayEnv,
  type PurchaseOrderEmailEnv,
  type ReviewBoosterEnv,
  type TwilioRestEnv,
} from "../index.js";

export const TradieIntegrationsFlagsSchema = z
  .object({
    accountingSync: z.boolean().default(false),
    receiptOcr: z.boolean().default(false),
    smsComms: z.boolean().default(false),
    reviewBooster: z.boolean().default(false),
  })
  .passthrough();

export type TradieIntegrationsFlags = z.infer<typeof TradieIntegrationsFlagsSchema>;

export interface IntegrationsProcedureContext {
  db: DbOrTx;
  tenantId?: string | null;
  appId?: string;
  userId?: string;
  session?: { role?: string | null; appRole?: string | null } | null;
  subscriptionStatus?: {
    isTrialExpired?: boolean;
    isGracePeriod?: boolean;
    isPastDue?: boolean;
    isDeactivated?: boolean;
  };
  appFeatureFlags?: Partial<Record<string, unknown>> | null;
  env?: AiGatewayEnv & TwilioRestEnv & AccountingOAuthEnv & PurchaseOrderEmailEnv & ReviewBoosterEnv;
}

export interface IntegrationsProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext }) => Promise<TOut>): TProc;
}

function throwCoded(code: "FORBIDDEN" | "PRECONDITION_FAILED", message: string): never {
  throw Object.assign(new Error(message), { code });
}

function requireCtx(ctx: IntegrationsProcedureContext) {
  if (!ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new Error("Tenant context (tenantId, appId, userId) is required.");
  }
  return {
    db: ctx.db,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    userId: ctx.userId,
    env: ctx.env ?? {},
  };
}

function requireWrite(ctx: IntegrationsProcedureContext) {
  if (ctx.subscriptionStatus) {
    const isReadOnly =
      Boolean(ctx.subscriptionStatus.isTrialExpired) ||
      Boolean(ctx.subscriptionStatus.isGracePeriod) ||
      Boolean(ctx.subscriptionStatus.isPastDue) ||
      Boolean(ctx.subscriptionStatus.isDeactivated);
    if (isReadOnly) {
      throwCoded(
        "FORBIDDEN",
        "Your account is currently read-only. Please update your billing details to resume making changes."
      );
    }
  }
  if ((ctx.session?.role ?? "").toUpperCase() === "VIEWER") {
    throwCoded("FORBIDDEN", "Viewer members have read-only access.");
  }
}

function requireRole(ctx: IntegrationsProcedureContext, allowedRoles: readonly string[]) {
  const role = (ctx.session?.appRole ?? ctx.session?.role ?? "").toUpperCase();
  if (!role || !allowedRoles.includes(role)) {
    throwCoded("FORBIDDEN", "You do not have permission to perform this action.");
  }
}

function requireFlag(ctx: IntegrationsProcedureContext, flag: keyof TradieIntegrationsFlags) {
  const flags = resolveTypedAppFlags(ctx.appId, ctx.appFeatureFlags ?? null, TradieIntegrationsFlagsSchema);
  if (!flags[flag]) {
    throwCoded("PRECONDITION_FAILED", `Feature '${flag}' is disabled for this workspace.`);
  }
}

const ADMIN_ROLES = ["OWNER", "ADMIN"] as const;
const FIELD_ROLES = ["OWNER", "ADMIN", "TRADIE"] as const;

export function createAccountingRouter<TProc>(deps: { tenantProcedure: IntegrationsProcedureBuilder<TProc> }) {
  return {
    listConnections: deps.tenantProcedure.query(async ({ ctx }) => {
      requireFlag(ctx, "accountingSync");
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return listAccountingConnectionsQuery(c.db, c);
    }),
    startOAuth: deps.tenantProcedure.input(StartAccountingOAuthInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "accountingSync");
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return startAccountingOAuthCommand(c.env, input);
    }),
    saveConnection: deps.tenantProcedure.input(SaveAccountingConnectionInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "accountingSync");
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return saveAccountingConnectionCommand(c.db, c, input);
    }),
    disconnect: deps.tenantProcedure
      .input(z.object({ provider: AccountingProviderSchema }).strict())
      .mutation(async ({ ctx, input }) => {
        requireFlag(ctx, "accountingSync");
        requireWrite(ctx);
        requireRole(ctx, ADMIN_ROLES);
        const c = requireCtx(ctx);
        return disconnectAccountingCommand(c.db, c, input.provider);
      }),
    syncNow: deps.tenantProcedure
      .input(z.object({ provider: AccountingProviderSchema }).strict())
      .mutation(async ({ ctx, input }) => {
        requireFlag(ctx, "accountingSync");
        requireWrite(ctx);
        requireRole(ctx, ADMIN_ROLES);
        const c = requireCtx(ctx);
        return syncAccountingNowCommand(c.db, c, c.env, input.provider);
      }),
    upsertEntityLink: deps.tenantProcedure.input(UpsertEntityLinkInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "accountingSync");
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return upsertAccountingEntityLinkCommand(c.db, c, input);
    }),
  };
}

export function createSuppliersRouter<TProc>(deps: { tenantProcedure: IntegrationsProcedureBuilder<TProc> }) {
  return {
    listBills: deps.tenantProcedure.query(async ({ ctx }) => {
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return listSupplierBillsQuery(c.db, c);
    }),
    createBill: deps.tenantProcedure.input(CreateSupplierBillInput).mutation(async ({ ctx, input }) => {
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return createSupplierBillCommand(c.db, c, input);
    }),
    extractReceipt: deps.tenantProcedure.input(ExtractReceiptInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "receiptOcr");
      requireWrite(ctx);
      requireRole(ctx, FIELD_ROLES);
      const c = requireCtx(ctx);
      return extractReceiptViaAiVisionQuery(c.env, input);
    }),
    listPurchaseOrders: deps.tenantProcedure.query(async ({ ctx }) => {
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return listPurchaseOrdersQuery(c.db, c);
    }),
    createPurchaseOrder: deps.tenantProcedure.input(CreatePurchaseOrderInput).mutation(async ({ ctx, input }) => {
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return createPurchaseOrderCommand(c.db, c, input);
    }),
    sendPurchaseOrder: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        requireWrite(ctx);
        requireRole(ctx, ADMIN_ROLES);
        const c = requireCtx(ctx);
        return sendPurchaseOrderCommand(c.db, c, input.id, c.env);
      }),
    convertPurchaseOrderToBill: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        requireWrite(ctx);
        requireRole(ctx, ADMIN_ROLES);
        const c = requireCtx(ctx);
        return convertPurchaseOrderToBillCommand(c.db, c, input.id);
      }),
  };
}

export function createSmsRouter<TProc>(deps: {
  tenantProcedure: IntegrationsProcedureBuilder<TProc>;
  publicProcedure: IntegrationsProcedureBuilder<TProc>;
}) {
  return {
    getCreditBalance: deps.tenantProcedure.query(async ({ ctx }) => {
      requireFlag(ctx, "smsComms");
      requireRole(ctx, FIELD_ROLES);
      const c = requireCtx(ctx);
      return getSmsCreditBalanceQuery(c.db, c);
    }),
    getPhoneConfig: deps.tenantProcedure.query(async ({ ctx }) => {
      requireFlag(ctx, "smsComms");
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return getPhoneConfigQuery(c.db, c);
    }),
    savePhoneConfig: deps.tenantProcedure.input(SavePhoneConfigInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "smsComms");
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      return savePhoneConfigCommand(c.db, c, input);
    }),
    listThreads: deps.tenantProcedure.query(async ({ ctx }) => {
      requireFlag(ctx, "smsComms");
      requireRole(ctx, FIELD_ROLES);
      const c = requireCtx(ctx);
      return listSmsThreadsQuery(c.db, c);
    }),
    listMessages: deps.tenantProcedure
      .input(z.object({ recipient: z.string().min(1) }).strict())
      .query(async ({ ctx, input }) => {
        requireFlag(ctx, "smsComms");
        requireRole(ctx, FIELD_ROLES);
        const c = requireCtx(ctx);
        return listSmsMessagesQuery(c.db, c, input.recipient);
      }),
    sendReply: deps.tenantProcedure.input(SendSmsReplyInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "smsComms");
      requireWrite(ctx);
      requireRole(ctx, FIELD_ROLES);
      const c = requireCtx(ctx);
      return sendSmsReplyCommand(c.db, c, c.env, input);
    }),
    sendOnMyWay: deps.tenantProcedure.input(SendOnMyWaySmsInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "smsComms");
      requireWrite(ctx);
      requireRole(ctx, FIELD_ROLES);
      const c = requireCtx(ctx);
      return sendOnMyWaySmsCommand(c.db, c, c.env, input);
    }),
    sendReviewBooster: deps.tenantProcedure.input(SendReviewBoosterInput).mutation(async ({ ctx, input }) => {
      requireFlag(ctx, "reviewBooster");
      requireWrite(ctx);
      requireRole(ctx, ADMIN_ROLES);
      const c = requireCtx(ctx);
      const flags = resolveTypedAppFlags(ctx.appId, ctx.appFeatureFlags ?? null, TradieIntegrationsFlagsSchema);
      return sendReviewBoosterCommand(c.db, c, input, { ...c.env, smsCommsEnabled: flags.smsComms });
    }),
    getByToken: deps.publicProcedure
      .input(z.object({ reviewRequestId: z.string().uuid() }).strict())
      .query(async ({ ctx, input }) => {
        return getReviewRequestByTokenQuery(ctx.db, input.reviewRequestId);
      }),
    submitSatisfaction: deps.publicProcedure.input(SubmitSatisfactionInput).mutation(async ({ ctx, input }) => {
      return submitCustomerSatisfactionCommand(ctx.db, input);
    }),
  };
}
