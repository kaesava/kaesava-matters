import { and, eq, isNull } from "drizzle-orm";
import {
  tenants,
  tmBusinessProfiles,
  tmTeamMemberProfiles,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type {
  CompleteBusinessSetupInputType,
  UpdateBusinessProfileInputType,
  UpsertTeamMemberProfileInputType,
} from "./schemas.js";
import { getBusinessProfileQuery, type BusinessProfileRecord } from "./queries.js";

function buildBusinessUpdateFields(
  input: UpdateBusinessProfileInputType,
  userId: string,
  now: Date
) {
  return {
    ...(input.tradeType !== undefined ? { tradeType: input.tradeType } : {}),
    ...(input.abn !== undefined ? { abn: input.abn } : {}),
    ...(input.gstRegistered !== undefined ? { gstRegistered: input.gstRegistered } : {}),
    ...(input.defaultTaxRatePercent !== undefined
      ? { defaultTaxRatePercent: input.defaultTaxRatePercent }
      : {}),
    ...(input.quotePrefix !== undefined ? { quotePrefix: input.quotePrefix } : {}),
    ...(input.nextQuoteNumber !== undefined ? { nextQuoteNumber: input.nextQuoteNumber } : {}),
    ...(input.invoicePrefix !== undefined ? { invoicePrefix: input.invoicePrefix } : {}),
    ...(input.nextInvoiceNumber !== undefined
      ? { nextInvoiceNumber: input.nextInvoiceNumber }
      : {}),
    ...(input.defaultPaymentTermsDays !== undefined
      ? { defaultPaymentTermsDays: input.defaultPaymentTermsDays }
      : {}),
    ...(input.defaultHourlyChargeRate !== undefined
      ? { defaultHourlyChargeRate: input.defaultHourlyChargeRate }
      : {}),
    ...(input.bankAccountName !== undefined ? { bankAccountName: input.bankAccountName } : {}),
    ...(input.bankBsb !== undefined ? { bankBsb: input.bankBsb } : {}),
    ...(input.bankAccountNumber !== undefined
      ? { bankAccountNumber: input.bankAccountNumber }
      : {}),
    updatedAt: now,
    updatedBy: userId,
  };
}

export async function upsertBusinessProfileRow(
  db: DbOrTx,
  params: { tenantId: string; appId: string; userId: string },
  input: UpdateBusinessProfileInputType
): Promise<BusinessProfileRecord> {
  const now = new Date();
  const existing = await getBusinessProfileQuery(db, params.tenantId, params.appId);
  if (existing) {
    await db
      .update(tmBusinessProfiles)
      .set(buildBusinessUpdateFields(input, params.userId, now))
      .where(eq(tmBusinessProfiles.id, existing.id));
  } else {
    await db.insert(tmBusinessProfiles).values({
      ...buildBusinessUpdateFields(input, params.userId, now),
      tenantId: params.tenantId,
      appId: params.appId,
      createdAt: now,
      createdBy: params.userId,
    });
  }
  const updated = await getBusinessProfileQuery(db, params.tenantId, params.appId);
  if (!updated) throw new Error("Failed to persist business profile.");
  return updated;
}

export async function updateBusinessProfileCommand(
  db: DbOrTx,
  params: { tenantId: string; appId: string; userId: string },
  input: UpdateBusinessProfileInputType
): Promise<BusinessProfileRecord> {
  const now = new Date();
  if (input.businessName) {
    await db
      .update(tenants)
      .set({ name: input.businessName, updatedAt: now, updatedBy: params.userId })
      .where(eq(tenants.id, params.tenantId));
  }
  return upsertBusinessProfileRow(db, params, input);
}

export async function completeBusinessSetupCommand(
  db: DbOrTx,
  params: { tenantId: string; appId: string; userId: string },
  input: CompleteBusinessSetupInputType
): Promise<{ profile: BusinessProfileRecord; setupCompletedAt: Date }> {
  const now = new Date();
  const profile = await upsertBusinessProfileRow(db, params, input);
  await db
    .update(tenants)
    .set({
      ...(input.businessName ? { name: input.businessName } : {}),
      setupStatus: "COMPLETED",
      setupCompletedAt: now,
      updatedAt: now,
      updatedBy: params.userId,
    })
    .where(eq(tenants.id, params.tenantId));
  return { profile, setupCompletedAt: now };
}

function buildTeamProfileFields(
  input: UpsertTeamMemberProfileInputType,
  actorUserId: string,
  now: Date
) {
  return {
    ...(input.tradeLicenseNumber !== undefined
      ? { tradeLicenseNumber: input.tradeLicenseNumber }
      : {}),
    ...(input.licenseExpiryDate !== undefined
      ? { licenseExpiryDate: input.licenseExpiryDate }
      : {}),
    ...(input.internalHourlyCostRate !== undefined
      ? { internalHourlyCostRate: input.internalHourlyCostRate }
      : {}),
    ...(input.defaultChargeOutRate !== undefined
      ? { defaultChargeOutRate: input.defaultChargeOutRate }
      : {}),
    ...(input.colorHex !== undefined ? { colorHex: input.colorHex } : {}),
    ...(input.phone !== undefined ? { phone: input.phone } : {}),
    ...(input.isFieldActive !== undefined ? { isFieldActive: input.isFieldActive } : {}),
    updatedAt: now,
    updatedBy: actorUserId,
  };
}

export async function upsertTeamMemberProfileCommand(
  db: DbOrTx,
  params: { tenantId: string; appId: string; actorUserId: string },
  input: UpsertTeamMemberProfileInputType
) {
  const now = new Date();
  const [existing] = await db
    .select({ id: tmTeamMemberProfiles.id })
    .from(tmTeamMemberProfiles)
    .where(
      and(
        eq(tmTeamMemberProfiles.tenantId, params.tenantId),
        eq(tmTeamMemberProfiles.appId, params.appId),
        eq(tmTeamMemberProfiles.userId, input.userId),
        isNull(tmTeamMemberProfiles.archivedAt)
      )
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(tmTeamMemberProfiles)
      .set(buildTeamProfileFields(input, params.actorUserId, now))
      .where(eq(tmTeamMemberProfiles.id, existing.id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(tmTeamMemberProfiles)
    .values({
      userId: input.userId,
      ...buildTeamProfileFields(input, params.actorUserId, now),
      tenantId: params.tenantId,
      appId: params.appId,
      createdAt: now,
      createdBy: params.actorUserId,
    })
    .returning();
  return created;
}
