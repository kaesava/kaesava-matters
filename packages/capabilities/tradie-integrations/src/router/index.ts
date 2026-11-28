import { z } from "zod";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  SaveAccountingConnectionInput,
  UpsertEntityLinkInput,
  listAccountingConnectionsQuery,
  saveAccountingConnectionCommand,
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
  SendOnMyWaySmsInput,
  sendOnMyWaySmsCommand,
  SendReviewBoosterInput,
  sendReviewBoosterCommand,
  SubmitSatisfactionInput,
  submitCustomerSatisfactionCommand,
  type AiGatewayEnv,
  type TwilioRestEnv,
} from "../index.js";

export interface IntegrationsProcedureContext {
  db: DbOrTx;
  tenantId?: string | null;
  appId?: string;
  userId?: string;
  env?: AiGatewayEnv & TwilioRestEnv;
}

export interface IntegrationsProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: IntegrationsProcedureContext }) => Promise<TOut>): TProc;
}

function requireCtx(ctx: IntegrationsProcedureContext) {
  if (!ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new Error("Tenant context (tenantId, appId, userId) is required.");
  }
  return { db: ctx.db, tenantId: ctx.tenantId, appId: ctx.appId, userId: ctx.userId, env: ctx.env ?? {} };
}

export function createAccountingRouter<TProc>(deps: { tenantProcedure: IntegrationsProcedureBuilder<TProc> }) {
  return {
    listConnections: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      return listAccountingConnectionsQuery(c.db, c);
    }),
    saveConnection: deps.tenantProcedure.input(SaveAccountingConnectionInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return saveAccountingConnectionCommand(c.db, c, input);
    }),
    upsertEntityLink: deps.tenantProcedure.input(UpsertEntityLinkInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return upsertAccountingEntityLinkCommand(c.db, c, input);
    }),
  };
}

export function createSuppliersRouter<TProc>(deps: { tenantProcedure: IntegrationsProcedureBuilder<TProc> }) {
  return {
    listBills: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      return listSupplierBillsQuery(c.db, c);
    }),
    createBill: deps.tenantProcedure.input(CreateSupplierBillInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return createSupplierBillCommand(c.db, c, input);
    }),
    extractReceipt: deps.tenantProcedure.input(ExtractReceiptInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return extractReceiptViaAiVisionQuery(c.env, input);
    }),
    listPurchaseOrders: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireCtx(ctx);
      return listPurchaseOrdersQuery(c.db, c);
    }),
    createPurchaseOrder: deps.tenantProcedure.input(CreatePurchaseOrderInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return createPurchaseOrderCommand(c.db, c, input);
    }),
    sendPurchaseOrder: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        const c = requireCtx(ctx);
        return sendPurchaseOrderCommand(c.db, c, input.id);
      }),
    convertPurchaseOrderToBill: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
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
      const c = requireCtx(ctx);
      return getSmsCreditBalanceQuery(c.db, c);
    }),
    sendOnMyWay: deps.tenantProcedure.input(SendOnMyWaySmsInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return sendOnMyWaySmsCommand(c.db, c, c.env, input);
    }),
    sendReviewBooster: deps.tenantProcedure.input(SendReviewBoosterInput).mutation(async ({ ctx, input }) => {
      const c = requireCtx(ctx);
      return sendReviewBoosterCommand(c.db, c, input);
    }),
    submitSatisfaction: deps.publicProcedure.input(SubmitSatisfactionInput).mutation(async ({ ctx, input }) => {
      return submitCustomerSatisfactionCommand(ctx.db, input);
    }),
  };
}
