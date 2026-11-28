import { z } from "zod";

export const QuoteGstMode = z.enum(["EXCLUSIVE", "INCLUSIVE", "GST_FREE"]);
export const QuoteDepositType = z.enum(["NONE", "PERCENT", "FIXED"]);
export const QuoteTaxCode = z.enum(["GST", "GST_FREE"]);

export const QuoteLineInput = z
  .object({
    optionGroupKey: z.string().max(64).optional(),
    pricebookItemId: z.string().uuid().optional().nullable(),
    description: z.string().trim().min(1).max(500),
    quantity: z.number().positive(),
    unitCostExTax: z.number().nonnegative().default(0),
    unitSellPrice: z.number().nonnegative(),
    taxCode: QuoteTaxCode.default("GST"),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .strict();

export const QuoteOptionGroupInput = z
  .object({
    key: z.string().min(1).max(64),
    name: z.string().trim().min(1).max(100),
    description: z.string().max(1000).optional().nullable(),
    isRecommended: z.boolean().default(false),
    isSelected: z.boolean().default(false),
    sortOrder: z.number().int().nonnegative().default(0),
  })
  .strict();

export const CreateQuoteInput = z
  .object({
    title: z.string().trim().min(1).max(255),
    description: z.string().max(4000).optional().nullable(),
    customerId: z.string().uuid(),
    siteId: z.string().uuid().optional().nullable(),
    jobId: z.string().uuid().optional().nullable(),
    validUntil: z.string().datetime().optional().nullable(),
    gstMode: QuoteGstMode.default("EXCLUSIVE"),
    depositType: QuoteDepositType.default("NONE"),
    depositValue: z.number().nonnegative().default(0),
    notes: z.string().max(4000).optional().nullable(),
    optionGroups: z.array(QuoteOptionGroupInput).default([]),
    lines: z.array(QuoteLineInput).min(1),
  })
  .strict();

export const UpdateQuoteInput = CreateQuoteInput.extend({
  id: z.string().uuid(),
  version: z.number().int().positive().optional(),
}).strict();

export const SendQuoteInput = z
  .object({
    id: z.string().uuid(),
    recipientEmail: z.string().email().optional(),
  })
  .strict();

export const QuotePortalTokenInput = z
  .object({
    rawToken: z.string().min(16).max(256),
  })
  .strict();

export const AcceptQuoteViaPortalInput = z
  .object({
    rawToken: z.string().min(16).max(256),
    signerName: z.string().trim().min(1).max(255),
    signatureSvg: z.string().min(1).max(50000),
    selectedOptionGroupId: z.string().uuid().optional().nullable(),
  })
  .strict();

export const DeclineQuoteViaPortalInput = z
  .object({
    rawToken: z.string().min(16).max(256),
    declineReason: z.string().max(2000).optional().nullable(),
  })
  .strict();

export type QuoteLineInputType = z.infer<typeof QuoteLineInput>;
export type QuoteOptionGroupInputType = z.infer<typeof QuoteOptionGroupInput>;
export type CreateQuoteInputType = z.infer<typeof CreateQuoteInput>;
export type UpdateQuoteInputType = z.infer<typeof UpdateQuoteInput>;
