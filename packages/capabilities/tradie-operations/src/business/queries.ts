import { and, eq, isNull } from "drizzle-orm";
import {
  tenantUsers,
  tmBusinessProfiles,
  tmTeamMemberProfiles,
  users,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { canReadInternalCostRates } from "../rbac/policy.js";

export interface BusinessProfileRecord {
  id: string;
  tradeType: string;
  abn: string | null;
  gstRegistered: boolean;
  defaultTaxRatePercent: string;
  quotePrefix: string;
  nextQuoteNumber: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultPaymentTermsDays: number;
  defaultHourlyChargeRate: string | null;
  bankAccountName: string | null;
  bankBsb: string | null;
  bankAccountNumber: string | null;
  tenantId: string;
  appId: string;
  createdAt: Date;
  updatedAt: Date;
}

export async function getBusinessProfileQuery(
  db: DbOrTx,
  tenantId: string,
  appId: string
): Promise<BusinessProfileRecord | null> {
  const [profile] = await db
    .select({
      id: tmBusinessProfiles.id,
      tradeType: tmBusinessProfiles.tradeType,
      abn: tmBusinessProfiles.abn,
      gstRegistered: tmBusinessProfiles.gstRegistered,
      defaultTaxRatePercent: tmBusinessProfiles.defaultTaxRatePercent,
      quotePrefix: tmBusinessProfiles.quotePrefix,
      nextQuoteNumber: tmBusinessProfiles.nextQuoteNumber,
      invoicePrefix: tmBusinessProfiles.invoicePrefix,
      nextInvoiceNumber: tmBusinessProfiles.nextInvoiceNumber,
      defaultPaymentTermsDays: tmBusinessProfiles.defaultPaymentTermsDays,
      defaultHourlyChargeRate: tmBusinessProfiles.defaultHourlyChargeRate,
      bankAccountName: tmBusinessProfiles.bankAccountName,
      bankBsb: tmBusinessProfiles.bankBsb,
      bankAccountNumber: tmBusinessProfiles.bankAccountNumber,
      tenantId: tmBusinessProfiles.tenantId,
      appId: tmBusinessProfiles.appId,
      createdAt: tmBusinessProfiles.createdAt,
      updatedAt: tmBusinessProfiles.updatedAt,
    })
    .from(tmBusinessProfiles)
    .where(
      and(
        eq(tmBusinessProfiles.tenantId, tenantId),
        eq(tmBusinessProfiles.appId, appId),
        isNull(tmBusinessProfiles.archivedAt)
      )
    )
    .limit(1);
  return profile ?? null;
}

export interface TeamMemberWithRatesRecord {
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
  appRole: string | null;
  profileId: string | null;
  tradeLicenseNumber: string | null;
  licenseExpiryDate: string | null;
  internalHourlyCostRate: string | null;
  defaultChargeOutRate: string | null;
  colorHex: string | null;
  phone: string | null;
  isFieldActive: boolean;
}

export async function listTeamMembersWithRatesQuery(
  db: DbOrTx,
  params: {
    tenantId: string;
    appId: string;
    callerBaseRole?: string | null;
    callerAppRole?: string | null;
  }
): Promise<TeamMemberWithRatesRecord[]> {
  const canSeeCost = canReadInternalCostRates(params.callerBaseRole, params.callerAppRole);
  const rows = await db
    .select({
      userId: users.id,
      email: users.email,
      displayName: users.displayName,
      role: tenantUsers.role,
      appRole: tenantUsers.appRole,
      profileId: tmTeamMemberProfiles.id,
      tradeLicenseNumber: tmTeamMemberProfiles.tradeLicenseNumber,
      licenseExpiryDate: tmTeamMemberProfiles.licenseExpiryDate,
      internalHourlyCostRate: tmTeamMemberProfiles.internalHourlyCostRate,
      defaultChargeOutRate: tmTeamMemberProfiles.defaultChargeOutRate,
      colorHex: tmTeamMemberProfiles.colorHex,
      phone: tmTeamMemberProfiles.phone,
      isFieldActive: tmTeamMemberProfiles.isFieldActive,
    })
    .from(tenantUsers)
    .innerJoin(users, eq(tenantUsers.userId, users.id))
    .leftJoin(
      tmTeamMemberProfiles,
      and(
        eq(tmTeamMemberProfiles.userId, users.id),
        eq(tmTeamMemberProfiles.tenantId, params.tenantId),
        eq(tmTeamMemberProfiles.appId, params.appId),
        isNull(tmTeamMemberProfiles.archivedAt)
      )
    )
    .where(and(eq(tenantUsers.tenantId, params.tenantId), isNull(tenantUsers.archivedAt)));

  return rows.map((row) => ({
    ...row,
    isFieldActive: row.isFieldActive ?? true,
    internalHourlyCostRate: canSeeCost ? row.internalHourlyCostRate : null,
  }));
}
