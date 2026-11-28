import { z } from "zod";

const coordString = z.string().regex(/^-?\d+(\.\d{1,7})?$/, "Must be a valid coordinate").nullable().optional();
const decimalString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal");

export const PhotoCategoryEnum = z.enum([
  "BEFORE",
  "PROGRESS",
  "AFTER",
  "SAFETY",
  "COMPLIANCE",
  "RECEIPT",
]);
export const AttachmentVisibilityEnum = z.enum(["INTERNAL", "CUSTOMER_PORTAL", "INVOICE"]);
export const TaxCodeEnum = z.enum(["GST", "GST_FREE", "EXEMPT"]);

export const CheckInVisitInput = z
  .object({
    visitId: z.string().uuid(),
    timestamp: z.string().datetime().optional(),
    latitude: coordString,
    longitude: coordString,
    visitNotes: z.string().max(2000).nullable().optional(),
    clientMutationId: z.string().max(120).optional(),
  })
  .strict();

export type CheckInVisitInputType = z.infer<typeof CheckInVisitInput>;

export const CheckOutVisitInput = z
  .object({
    visitId: z.string().uuid(),
    timestamp: z.string().datetime().optional(),
    latitude: coordString,
    longitude: coordString,
    visitNotes: z.string().max(2000).nullable().optional(),
    isBillable: z.boolean().default(true),
    notes: z.string().max(2000).nullable().optional(),
    clientMutationId: z.string().max(120).optional(),
  })
  .strict();

export type CheckOutVisitInputType = z.infer<typeof CheckOutVisitInput>;

export const VariationLineInput = z
  .object({
    pricebookItemId: z.string().uuid().nullable().optional(),
    description: z.string().min(1).max(500),
    quantity: decimalString.default("1.00"),
    unitCostExTax: decimalString.default("0.00"),
    unitSellPriceExTax: decimalString.default("0.00"),
    taxCode: TaxCodeEnum.default("GST"),
    sortOrder: z.number().int().min(0).default(0),
  })
  .strict();

export const CreateVariationInput = z
  .object({
    jobId: z.string().uuid(),
    variationNumber: z.string().min(1).max(40).optional(),
    title: z.string().min(1).max(255),
    description: z.string().max(4000).nullable().optional(),
    lines: z.array(VariationLineInput).min(1),
  })
  .strict();

export type CreateVariationInputType = z.infer<typeof CreateVariationInput>;

export const ApproveVariationInput = z
  .object({
    variationId: z.string().uuid(),
    approvedByName: z.string().min(1).max(255),
  })
  .strict();

export type ApproveVariationInputType = z.infer<typeof ApproveVariationInput>;

export const LogMaterialUsageInput = z
  .object({
    jobId: z.string().uuid(),
    visitId: z.string().uuid().nullable().optional(),
    pricebookItemId: z.string().uuid().nullable().optional(),
    description: z.string().min(1).max(500),
    quantity: decimalString.default("1.00"),
    unitCostSnapshot: decimalString.optional(),
    unitSellPriceExTax: decimalString.optional(),
    taxCode: TaxCodeEnum.default("GST"),
    isBillable: z.boolean().default(true),
    clientMutationId: z.string().max(120).optional(),
  })
  .strict();

export type LogMaterialUsageInputType = z.infer<typeof LogMaterialUsageInput>;

export const AttachJobPhotoInput = z
  .object({
    jobId: z.string().uuid(),
    visitId: z.string().uuid().nullable().optional(),
    fileNoteId: z.string().uuid(),
    photoCategory: PhotoCategoryEnum.default("PROGRESS"),
    visibility: AttachmentVisibilityEnum.default("INTERNAL"),
    caption: z.string().max(500).nullable().optional(),
  })
  .strict();

export type AttachJobPhotoInputType = z.infer<typeof AttachJobPhotoInput>;

export const SyncFieldMutationItem = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("CHECK_IN"), clientMutationId: z.string().min(1).max(120), payload: CheckInVisitInput }).strict(),
  z.object({ kind: z.literal("CHECK_OUT"), clientMutationId: z.string().min(1).max(120), payload: CheckOutVisitInput }).strict(),
  z.object({ kind: z.literal("LOG_MATERIAL"), clientMutationId: z.string().min(1).max(120), payload: LogMaterialUsageInput }).strict(),
  z.object({ kind: z.literal("ATTACH_PHOTO"), clientMutationId: z.string().min(1).max(120), payload: AttachJobPhotoInput }).strict(),
]);

export const SyncFieldMutationsInput = z
  .object({
    mutations: z.array(SyncFieldMutationItem).max(100),
  })
  .strict();

export type SyncFieldMutationsInputType = z.infer<typeof SyncFieldMutationsInput>;
