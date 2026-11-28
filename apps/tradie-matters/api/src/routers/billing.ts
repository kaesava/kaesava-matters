import { billingProcedures } from "@kaesava/capability-billing/router";
import { ownerProcedure, tenantProcedure } from "../trpc/trpc.js";

export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus;
  }),

  createCheckoutSession: ownerProcedure
    .input(billingProcedures.createCheckoutSession.input)
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session?.email || "info@tradiematters.kaesava.au";
      return billingProcedures.createCheckoutSession.execute(
        ctx.db,
        ctx.tenantId,
        userEmail,
        input,
        ctx.appId,
        ctx.userId
      );
    }),

  verifyCheckoutSession: ownerProcedure
    .input(billingProcedures.verifyCheckoutSession.input)
    .mutation(async ({ ctx, input }) => {
      return billingProcedures.verifyCheckoutSession.execute(
        ctx.db,
        ctx.tenantId,
        input.sessionId
      );
    }),

  createCustomerPortalSession: ownerProcedure
    .input(billingProcedures.createCustomerPortalSession.input)
    .mutation(async ({ ctx, input }) => {
      const userEmail = ctx.session?.email || undefined;
      return billingProcedures.createCustomerPortalSession.execute(
        ctx.db,
        ctx.tenantId,
        input,
        userEmail
      );
    }),

  listInvoices: tenantProcedure.query(async ({ ctx }) => {
    return billingProcedures.listInvoices.execute(ctx.db, ctx.tenantId, ctx.appId);
  }),

  syncSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    return billingProcedures.syncSubscription.execute(ctx.db, ctx.tenantId);
  }),
};
