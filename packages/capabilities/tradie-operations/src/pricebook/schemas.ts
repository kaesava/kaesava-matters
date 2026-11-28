import { z } from "zod";

export const PricebookItemTypeEnum = z.enum(["MATERIAL", "LABOUR", "EQUIPMENT", "SUBCONTRACT"]);
export const PricebookTaxCodeEnum = z.enum(["GST", "GST_FREE", "EXEMPT"]);
export const TradePackKeyEnum = z.enum([
  "ELECTRICAL",
  "PLUMBING",
  "HVAC",
  "CARPENTRY",
  "PAINTING",
  "GENERAL",
]);
export const PricebookCsvSourceEnum = z.enum(["XERO", "TRADIFY", "SERVICEM8", "FERGUS"]);

const moneyString = z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid monetary amount");
const pctString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Must be a valid percentage");

export const CreatePricebookItemInput = z
  .object({
    sku: z.string().max(80).nullable().optional(),
    name: z.string().min(1).max(255),
    description: z.string().max(2000).nullable().optional(),
    itemType: PricebookItemTypeEnum.default("MATERIAL"),
    category: z.string().max(100).nullable().optional(),
    unitOfMeasure: z.string().min(1).max(32).default("EACH"),
    searchAliases: z.string().max(1000).nullable().optional(),
    unitCostExTax: moneyString.default("0.00"),
    markupPct: pctString.default("0.00"),
    sellPriceExTax: moneyString.default("0.00"),
    taxCode: PricebookTaxCodeEnum.default("GST"),
    isFavourite: z.boolean().default(false),
    supplierName: z.string().max(255).nullable().optional(),
  })
  .strict();

export type CreatePricebookItemInputType = z.infer<typeof CreatePricebookItemInput>;

export const UpdatePricebookItemInput = CreatePricebookItemInput.partial()
  .extend({ id: z.string().uuid() })
  .strict();

export type UpdatePricebookItemInputType = z.infer<typeof UpdatePricebookItemInput>;

export const FuzzySearchPricebookInput = z
  .object({
    query: z.string().max(200).default(""),
    itemType: PricebookItemTypeEnum.optional(),
    favouritesOnly: z.boolean().optional(),
    limit: z.number().int().min(1).max(100).default(25),
  })
  .strict();

export const InstallStarterPackInput = z
  .object({
    packKey: TradePackKeyEnum,
  })
  .strict();

export const ImportPricebookCsvInput = z
  .object({
    source: PricebookCsvSourceEnum,
    csvText: z.string().min(1).max(2_000_000),
  })
  .strict();
