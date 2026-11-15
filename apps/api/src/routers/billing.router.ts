import { tenantProcedure, ownerProcedure } from '../trpc/trpc.js';
import {
  CreateCheckoutSessionCommand,
  CreateCustomerPortalCommand,
  VerifyCheckoutSessionCommand,
} from '@money-matters/types';
import {
  createCheckoutSessionCommand,
  createCustomerPortalSessionCommand,
  verifyCheckoutSessionCommand,
  listInvoicesQuery,
  syncSubscriptionCommand,
} from '@money-matters/capability-billing';
import { captureIfConsented } from '../lib/posthog.js';

export const billingRouter = {
  getSubscriptionStatus: tenantProcedure.query(async ({ ctx }) => {
    return ctx.subscriptionStatus;
  }),

  createCheckoutSession: ownerProcedure
    .input(CreateCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userEmail = ctx.session?.email || 'info@moneymatters.kaesava.au';
      const result = await createCheckoutSessionCommand(ctx.db, tenantId, userEmail, input);
      await captureIfConsented(ctx.db, ctx.userId, 'checkout_session_created', {
        tenant_id: tenantId,
        priceId: input.priceId,
      });
      return result;
    }),

  verifyCheckoutSession: ownerProcedure
    .input(VerifyCheckoutSessionCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const result = await verifyCheckoutSessionCommand(ctx.db, tenantId, input.sessionId);
      if (result.verified) {
        await captureIfConsented(ctx.db, ctx.userId, 'subscription_checkout_verified', {
          tenant_id: tenantId,
          status: result.subscriptionStatus,
        });
      }
      return result;
    }),

  createCustomerPortalSession: ownerProcedure
    .input(CreateCustomerPortalCommand)
    .mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tenantId!;
      const userEmail = ctx.session?.email || undefined;
      return createCustomerPortalSessionCommand(ctx.db, tenantId, input, userEmail);
    }),

  listInvoices: tenantProcedure.query(async ({ ctx }) => {
    return await listInvoicesQuery(ctx.db, ctx.tenantId!);
  }),

  syncSubscription: ownerProcedure.mutation(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    return await syncSubscriptionCommand(ctx.db, tenantId);
  }),
};

