import { z } from "zod";

const optionalMoneyString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid monetary amount")
  .nullable()
  .optional();

export const UpdateBusinessProfileInput = z
  .object({
    businessName: z.string().min(1).max(120).optional(),
    tradeType: z.string().min(1).max(100).optional(),
    abn: z.string().max(32).nullable().optional(),
    gstRegistered: z.boolean().optional(),
    defaultTaxRatePercent: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, "Must be a valid percentage")
      .optional(),
    quotePrefix: z.string().min(1).max(20).optional(),
    nextQuoteNumber: z.number().int().min(1).optional(),
    invoicePrefix: z.string().min(1).max(20).optional(),
    nextInvoiceNumber: z.number().int().min(1).optional(),
    defaultPaymentTermsDays: z.number().int().min(0).max(365).optional(),
    defaultHourlyChargeRate: optionalMoneyString,
    bankAccountName: z.string().max(255).nullable().optional(),
    bankBsb: z.string().max(20).nullable().optional(),
    bankAccountNumber: z.string().max(40).nullable().optional(),
  })
  .strict();

export type UpdateBusinessProfileInputType = z.infer<typeof UpdateBusinessProfileInput>;

export const CompleteBusinessSetupInput = UpdateBusinessProfileInput.extend({
  tradeType: z.string().min(1).max(100).default("GENERAL"),
}).strict();

export type CompleteBusinessSetupInputType = z.infer<typeof CompleteBusinessSetupInput>;

export const UpsertTeamMemberProfileInput = z
  .object({
    userId: z.string().uuid(),
    tradeLicenseNumber: z.string().max(100).nullable().optional(),
    licenseExpiryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format")
      .nullable()
      .optional(),
    internalHourlyCostRate: optionalMoneyString,
    defaultChargeOutRate: optionalMoneyString,
    colorHex: z.string().max(16).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    isFieldActive: z.boolean().optional(),
  })
  .strict();

export type UpsertTeamMemberProfileInputType = z.infer<typeof UpsertTeamMemberProfileInput>;
