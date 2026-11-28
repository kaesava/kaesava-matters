import { z } from "zod";

export const TradieFeatureFlagsSchema = z
  .object({
    accountingSync: z.boolean().default(false),
    receiptOcr: z.boolean().default(false),
    smsComms: z.boolean().default(false),
    reviewBooster: z.boolean().default(false),
    payToPayments: z.boolean().default(false),
  })
  .strict();

export type TradieAppFeatureFlags = z.infer<typeof TradieFeatureFlagsSchema>;

export const TRADIE_JOB_STATUSES = [
  "LEAD",
  "QUOTED",
  "APPROVED",
  "SCHEDULED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "INVOICED",
  "PAID",
  "CANCELLED",
] as const;

export type TradieJobStatus = (typeof TRADIE_JOB_STATUSES)[number];

export const TIME_ENTRY_APPROVAL_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "EXPORTED",
] as const;

export type TimeEntryApprovalStatus = (typeof TIME_ENTRY_APPROVAL_STATUSES)[number];

export const INVOICE_PAYMENT_METHODS = [
  "PAYID",
  "BANK_TRANSFER",
  "STRIPE_PAYTO",
  "STRIPE_BECS",
  "STRIPE_CARD",
  "CASH",
  "CREDIT_NOTE",
] as const;

export type InvoicePaymentMethod = (typeof INVOICE_PAYMENT_METHODS)[number];
