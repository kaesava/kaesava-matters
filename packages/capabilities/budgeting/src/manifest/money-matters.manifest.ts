import { z } from "zod";
import { registerAppManifest, type AppManifest } from "@money-matters/config";
import { defineAppRolePolicy } from "@money-matters/core";

export const MONEY_MATTERS_MANIFEST_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

export const moneyMattersAppFlagsSchema = z.object({
  canAffordCalculator: z.boolean().default(true),
  simulation: z.boolean().default(true),
  customAllocationRules: z.boolean().default(true),
  reports: z.boolean().default(true),
});

export type MoneyMattersAppFlags = z.infer<typeof moneyMattersAppFlagsSchema>;

export const moneyMattersRolePolicy = defineAppRolePolicy({
  HOUSEHOLD_OWNER: { baseRole: "OWNER", permissions: ["*"] },
  PARTNER: {
    baseRole: "MEMBER",
    permissions: ["envelopes:write", "payday:write", "transactions:write", "reports:read"],
  },
  VIEWER: { baseRole: "VIEWER", permissions: ["reports:read"] },
});

export const moneyMattersManifest: AppManifest = {
  id: MONEY_MATTERS_MANIFEST_ID,
  name: "Money Matters",
  slug: "money-matters",
  trialDays: 60,
  maxOwnedTenantsPerUser: 1,
  storageKeyPrefix: "money_matters",
  authStoragePrefix: "money-matters",
  easProjectId: "5cf01baf-7dc6-43bf-aa23-a72da2de4aaf",
  branding: {
    companyName: "Kaesava AU",
    primaryDomain: "moneymatters.kaesava.au",
    appUrl: "https://moneymatters.kaesava.au",
    apiUrl: "https://api.moneymatters.kaesava.au",
    deepLinkScheme: "moneymatters://",
    supportEmail: "info@moneymatters.kaesava.au",
    fromEmail: "Money Matters <info@moneymatters.kaesava.au>",
    logoUrl: "https://moneymatters.kaesava.au/email-header-logo.png",
    legalAddress: "VIC 3030, Australia",
    notificationSettingsPath: "/dashboard/settings/notifications",
    billingSettingsPath: "/dashboard/settings?tab=subscription",
    signInPath: "/sign-in",
  },
  terminology: {
    tenantSingular: "Household",
    tenantPlural: "Households",
    memberSingular: "Partner",
  },
  allowedRedirectHosts: ["kaesava.au", ".kaesava.au", "localhost", "127.0.0.1"],
  features: {
    premiumEnabled: false,
    memberInvite: false,
    partnerInvite: false,
    offlineSync: false,
    foundingMemberPromo: true,
    aiAssistant: true,
    privateMode: true,
    fileNotes: true,
    bankAccounts: true,
    appFlags: {
      canAffordCalculator: true,
      simulation: true,
      customAllocationRules: true,
      reports: true,
    },
  },
};

export function registerMoneyMattersApp(): AppManifest {
  registerAppManifest(moneyMattersManifest);
  return moneyMattersManifest;
}
