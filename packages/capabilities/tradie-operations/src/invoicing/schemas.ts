import { z } from "zod";

export const InvoiceTypeEnum = z.enum(["DEPOSIT", "PROGRESS", "FINAL"]);
export const InvoiceTaxCode = z.enum(["GST", "GST_FREE"]);
export const InvoicePaymentMethod = z.enum([
  "STRIPE_CARD",
  "STRIPE_BECS",
  "BANK_TRANSFER",
  "CASH",
  "CUSTOMER_CREDIT",
]);

export const InvoiceLineInput = z
  .object({
    sourceType: z
      .enum(["QUOTE", "VARIATION", "TIME", "MATERIAL", "DEPOSIT_DEDUCTION", "MANUAL"])
      .default("MANUAL"),
    sourceId: z.string().uuid().optional().nullable(),
    pricebookItemId: z.string().uuid().optional().nullable(),
    description: z.string().trim().min(1).max(500),
    quantity: z.number(),
    unitCostExTax: z.number().default(0),
    unitSellPrice: z.number(),
    taxCode: InvoiceTaxCode.default("GST"),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .strict();

export const CreateInvoiceInput = z
  .object({
    invoiceType: InvoiceTypeEnum.default("FINAL"),
    customerId: z.string().uuid(),
    siteId: z.string().uuid().optional().nullable(),
    jobId: z.string().uuid().optional().nullable(),
    quoteId: z.string().uuid().optional().nullable(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    allowCardPayment: z.boolean().default(true),
    maxCardAmountOverride: z.number().positive().optional().nullable(),
    chasingEnabled: z.boolean().default(true),
    chasingScheduleDaysJson: z.array(z.number().int()).default([-3, 3, 14]),
    notes: z.string().max(4000).optional().nullable(),
    lines: z.array(InvoiceLineInput).min(1),
  })
  .strict();

export const UpdateInvoiceInput = CreateInvoiceInput.extend({
  id: z.string().uuid(),
}).strict();

export const ConvertJobToInvoiceInput = z
  .object({
    jobId: z.string().uuid(),
    sendImmediately: z.boolean().default(false),
    allowCardPayment: z.boolean().default(true),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();

export const RecordInvoicePaymentInput = z
  .object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    paymentMethod: InvoicePaymentMethod.default("BANK_TRANSFER"),
    reference: z.string().max(255).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const IssueCreditNoteInput = z
  .object({
    invoiceId: z.string().uuid(),
    reason: z.string().trim().min(1).max(2000),
    amountExTax: z.number().positive(),
    includeGst: z.boolean().default(true),
    creditDestination: z.enum(["INVOICE_BALANCE", "CUSTOMER_CREDIT"]).default("INVOICE_BALANCE"),
  })
  .strict();

export const ApplyCustomerCreditInput = z
  .object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
  })
  .strict();

export const RefundInvoicePaymentInput = z
  .object({
    paymentId: z.string().uuid(),
    amount: z.number().positive(),
    refundMethod: z.enum(["STRIPE", "MANUAL"]).default("MANUAL"),
    reason: z.string().max(2000).optional().nullable(),
  })
  .strict();

export const DisputeInvoiceInput = z
  .object({
    invoiceId: z.string().uuid(),
    disputedReason: z.string().trim().min(1).max(2000),
  })
  .strict();

export const CreatePortalCheckoutInput = z
  .object({
    rawToken: z.string().min(16).max(256),
    successUrl: z.string().url(),
    cancelUrl: z.string().url(),
  })
  .strict();

export type InvoiceLineInputType = z.infer<typeof InvoiceLineInput>;
export type CreateInvoiceInputType = z.infer<typeof CreateInvoiceInput>;
export type UpdateInvoiceInputType = z.infer<typeof UpdateInvoiceInput>;
