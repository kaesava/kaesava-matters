import {
  CreateCheckoutSessionCommand,
  CreateCustomerPortalCommand,
  VerifyCheckoutSessionCommand,
} from "@kaesava/types";
import {
  createCheckoutSessionCommand,
  createCustomerPortalSessionCommand,
  verifyCheckoutSessionCommand,
  listInvoicesQuery,
  syncSubscriptionCommand,
} from "../index";

export const billingProcedures = {
  createCheckoutSession: {
    input: CreateCheckoutSessionCommand,
    execute: createCheckoutSessionCommand,
  },
  verifyCheckoutSession: {
    input: VerifyCheckoutSessionCommand,
    execute: verifyCheckoutSessionCommand,
  },
  createCustomerPortalSession: {
    input: CreateCustomerPortalCommand,
    execute: createCustomerPortalSessionCommand,
  },
  listInvoices: {
    execute: listInvoicesQuery,
  },
  syncSubscription: {
    execute: syncSubscriptionCommand,
  },
} as const;
