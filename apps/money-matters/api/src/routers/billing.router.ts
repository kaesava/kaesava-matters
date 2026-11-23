import { tenantProcedure, ownerProcedure } from '../trpc/trpc.js';
import { billingProcedures } from '@kaesava/capability-billing/router';
import { captureIfConsented } from '../lib/posthog.js';

export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus;
  }),

  createCheckoutSession: ownerProcedure
    .input(billingProcedures.createCheckoutSession.input)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userEmail = ctx.session?.email || 'info@moneymatters.kaesava.au';
      const result = await billingProcedures.createCheckoutSession.execute(ctx.db, tenantId, userEmail, input);
      await captureIfConsented(ctx.db, ctx.userId, 'checkout_session_created', {
        tenant_id: tenantId,
        priceId: input.priceId,
      });
      return result;
    }),

  verifyCheckoutSession: ownerProcedure
    .input(billingProcedures.verifyCheckoutSession.input)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const result = await billingProcedures.verifyCheckoutSession.execute(ctx.db, tenantId, input.sessionId);
      if (result.verified) {
        await captureIfConsented(ctx.db, ctx.userId, 'subscription_checkout_verified', {
          tenant_id: tenantId,
          status: result.subscriptionStatus,
        });
      }
      return result;
    }),

  createCustomerPortalSession: ownerProcedure
    .input(billingProcedures.createCustomerPortalSession.input)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userEmail = ctx.session?.email || undefined;
      return billingProcedures.createCustomerPortalSession.execute(ctx.db, tenantId, input, userEmail);
    }),

  listInvoices: tenantProcedure.query(async ({ ctx }) => {
    return await billingProcedures.listInvoices.execute(ctx.db, ctx.tenantId!, ctx.appId);
  }),

  syncSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    return await billingProcedures.syncSubscription.execute(ctx.db, tenantId);
  }),
};

