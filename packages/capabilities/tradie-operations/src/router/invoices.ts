import { z } from "zod";
import {
  ApplyCustomerCreditInput,
  ConvertJobToInvoiceInput,
  CreateInvoiceInput,
  CreatePortalCheckoutInput,
  DisputeInvoiceInput,
  IssueCreditNoteInput,
  RecordInvoicePaymentInput,
  RefundInvoicePaymentInput,
  UpdateInvoiceInput,
} from "../invoicing/schemas.js";
import {
  getInvoiceByIdQuery,
  getInvoiceByPortalTokenQuery,
  listInvoicesQuery,
} from "../invoicing/queries.js";
import {
  createInvoiceCommand,
  disputeInvoiceCommand,
  sendInvoiceCommand,
  updateInvoiceCommand,
  voidInvoiceCommand,
} from "../invoicing/commands.js";
import { convertJobToInvoiceCommand } from "../invoicing/convert-job.js";
import {
  applyCustomerCreditCommand,
  issueCreditNoteCommand,
  recordInvoicePaymentCommand,
  refundInvoicePaymentCommand,
} from "../invoicing/payments-credits.js";
import {
  createDirectChargeCheckoutCommand,
  createStripeConnectAccountLinkCommand,
} from "../invoicing/stripe-connect.js";
import {
  assertTradiePermission,
  requireTradieCtx,
  type CreateTradieRouterDeps,
  type TradieProcedureBuilder,
} from "./context.js";

export function createInvoicesRouter<TProc>(
  deps: CreateTradieRouterDeps<TProc> & { getStripeSecretKey?: () => string | undefined }
) {
  return {
    list: deps.tenantProcedure
      .input(z.object({ status: z.string().optional() }).strict().optional())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:read");
        return listInvoicesQuery(c.db, c.tenantId, c.appId, input?.status);
      }),

    getById: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:read");
        return getInvoiceByIdQuery(c.db, c.tenantId, c.appId, input.id);
      }),

    create: deps.tenantProcedure
      .input(CreateInvoiceInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return createInvoiceCommand(c.db, c, input);
      }),

    update: deps.tenantProcedure
      .input(UpdateInvoiceInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return updateInvoiceCommand(c.db, c, input);
      }),

    send: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return sendInvoiceCommand(c.db, c, input.id);
      }),

    convertJob: deps.tenantProcedure
      .input(ConvertJobToInvoiceInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return convertJobToInvoiceCommand(c.db, c, input);
      }),

    recordPayment: deps.tenantProcedure
      .input(RecordInvoicePaymentInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return recordInvoicePaymentCommand(c.db, c, input);
      }),

    issueCreditNote: deps.tenantProcedure
      .input(IssueCreditNoteInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return issueCreditNoteCommand(c.db, c, input);
      }),

    applyCustomerCredit: deps.tenantProcedure
      .input(ApplyCustomerCreditInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return applyCustomerCreditCommand(c.db, c, input);
      }),

    refundPayment: deps.tenantProcedure
      .input(RefundInvoicePaymentInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return refundInvoicePaymentCommand(c.db, c, {
          ...input,
          stripeSecretKey: deps.getStripeSecretKey?.() ?? process.env.STRIPE_SECRET_KEY,
        });
      }),

    dispute: deps.tenantProcedure
      .input(DisputeInvoiceInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return disputeInvoiceCommand(c.db, c, input.invoiceId, input.disputedReason);
      }),

    voidInvoice: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:write");
        return voidInvoiceCommand(c.db, c, input.id);
      }),

    createConnectOnboardingLink: deps.tenantProcedure
      .input(z.object({ refreshUrl: z.string().url(), returnUrl: z.string().url() }).strict())
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "business:write");
        const stripeSecretKey = deps.getStripeSecretKey?.() ?? process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) throw new Error("Stripe secret key is not configured.");
        return createStripeConnectAccountLinkCommand(c.db, {
          tenantId: c.tenantId,
          appId: c.appId,
          userId: c.userId,
          stripeSecretKey,
          refreshUrl: input.refreshUrl,
          returnUrl: input.returnUrl,
        });
      }),
  };
}

export function createPortalInvoiceRouter<TProc>(deps: {
  publicProcedure: TradieProcedureBuilder<TProc>;
  getStripeSecretKey?: () => string | undefined;
}) {
  return {
    view: deps.publicProcedure
      .input(z.object({ rawToken: z.string().min(16).max(256) }).strict())
      .query(async ({ ctx, input }) => getInvoiceByPortalTokenQuery(ctx.db, input.rawToken)),

    createCheckout: deps.publicProcedure
      .input(CreatePortalCheckoutInput)
      .mutation(async ({ ctx, input }) => {
        const stripeSecretKey = deps.getStripeSecretKey?.() ?? process.env.STRIPE_SECRET_KEY;
        if (!stripeSecretKey) throw new Error("Stripe secret key is not configured.");
        return createDirectChargeCheckoutCommand(ctx.db, {
          ...input,
          stripeSecretKey,
        });
      }),
  };
}
