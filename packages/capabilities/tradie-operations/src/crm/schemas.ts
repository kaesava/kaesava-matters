import { z } from "zod";

export const CustomerTypeEnum = z.enum(["RESIDENTIAL", "COMMERCIAL", "STRATA", "REAL_ESTATE"]);
export const RelationshipRoleEnum = z.enum([
  "OWNER",
  "TENANT",
  "PROPERTY_MANAGER",
  "BILLING_CONTACT",
]);

const moneyString = z.string().regex(/^-?\d+(\.\d{1,2})?$/, "Must be a valid monetary amount");
const coordString = z.string().regex(/^-?\d+(\.\d{1,7})?$/, "Must be a valid coordinate").nullable().optional();

export const CreateCustomerInput = z
  .object({
    name: z.string().min(1).max(255),
    companyName: z.string().max(255).nullable().optional(),
    customerType: CustomerTypeEnum.default("RESIDENTIAL"),
    email: z.string().email().max(255).nullable().optional(),
    phone: z.string().max(40).nullable().optional(),
    mobile: z.string().max(40).nullable().optional(),
    abn: z.string().max(32).nullable().optional(),
    billingAddress: z.string().max(1000).nullable().optional(),
    paymentTermsDays: z.number().int().min(0).max(365).nullable().optional(),
    creditBalance: moneyString.optional(),
    notes: z.string().max(4000).nullable().optional(),
  })
  .strict();

export type CreateCustomerInputType = z.infer<typeof CreateCustomerInput>;

export const UpdateCustomerInput = CreateCustomerInput.partial()
  .extend({ id: z.string().uuid() })
  .strict();

export type UpdateCustomerInputType = z.infer<typeof UpdateCustomerInput>;

export const CreateSiteInput = z
  .object({
    name: z.string().min(1).max(255),
    addressLine1: z.string().min(1).max(255),
    addressLine2: z.string().max(255).nullable().optional(),
    suburb: z.string().max(120).nullable().optional(),
    state: z.string().max(64).nullable().optional(),
    postcode: z.string().max(20).nullable().optional(),
    country: z.string().min(2).max(80).default("AU"),
    latitude: coordString,
    longitude: coordString,
    accessNotes: z.string().max(2000).nullable().optional(),
    keySafeCode: z.string().max(64).nullable().optional(),
    siteContactName: z.string().max(255).nullable().optional(),
    siteContactPhone: z.string().max(40).nullable().optional(),
    customerId: z.string().uuid().optional(),
    relationshipRole: RelationshipRoleEnum.optional(),
    isPrimary: z.boolean().optional(),
  })
  .strict();

export type CreateSiteInputType = z.infer<typeof CreateSiteInput>;

export const UpdateSiteInput = CreateSiteInput.omit({
  customerId: true,
  relationshipRole: true,
  isPrimary: true,
})
  .partial()
  .extend({ id: z.string().uuid() })
  .strict();

export type UpdateSiteInputType = z.infer<typeof UpdateSiteInput>;

export const LinkCustomerSiteInput = z
  .object({
    customerId: z.string().uuid(),
    siteId: z.string().uuid(),
    relationshipRole: RelationshipRoleEnum.default("OWNER"),
    isPrimary: z.boolean().default(false),
  })
  .strict();

export type LinkCustomerSiteInputType = z.infer<typeof LinkCustomerSiteInput>;

export const IdInput = z.object({ id: z.string().uuid() }).strict();
export const SearchListInput = z
  .object({ search: z.string().max(120).optional(), limit: z.number().int().min(1).max(100).default(50) })
  .strict();
