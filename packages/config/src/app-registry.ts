/**
 * Monorepo Application Registry & AppManifest
 *
 * Configures registered multi-tenant SaaS applications, branding, terminology,
 * feature entitlements, and redirect allowlists.
 */

export interface AppBrandingConfig {
  companyName: string;
  primaryDomain: string;
  appUrl: string;
  apiUrl: string;
  deepLinkScheme: string;
  supportEmail: string;
  fromEmail: string;
  logoUrl: string;
}

export interface AppTerminologyConfig {
  tenantSingular: string;
  tenantPlural: string;
  memberSingular: string;
}

export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  trialDays: number;
  branding: AppBrandingConfig;
  terminology: AppTerminologyConfig;
  allowedRedirectHosts: readonly string[];
  features: {
    premiumEnabled: boolean;
    partnerInvite: boolean;
    offlineSync: boolean;
    canAffordCalculator: boolean;
    foundingMemberPromo: boolean;
    aiAssistant: boolean;
    privateMode: boolean;
    fileNotes: boolean;
    simulation: boolean;
    customAllocationRules: boolean;
    reports: boolean;
    bankAccounts?: boolean;
  };
}

export type AppManifest = AppConfig;

export const DEFAULT_APP_ID = "01908bde-34bb-7b19-a178-574211bc93aa";

const REGISTRY: Record<string, AppConfig> = {
  [DEFAULT_APP_ID]: {
    id: DEFAULT_APP_ID,
    name: "Money Matters",
    slug: "money-matters",
    trialDays: 60,
    branding: {
      companyName: "Kaesava AU",
      primaryDomain: "moneymatters.kaesava.au",
      appUrl: "https://moneymatters.kaesava.au",
      apiUrl: "https://api.moneymatters.kaesava.au",
      deepLinkScheme: "moneymatters://",
      supportEmail: "info@moneymatters.kaesava.au",
      fromEmail: "Money Matters <info@moneymatters.kaesava.au>",
      logoUrl: "https://moneymatters.kaesava.au/email-header-logo.png",
    },
    terminology: {
      tenantSingular: "Household",
      tenantPlural: "Households",
      memberSingular: "Partner",
    },
    allowedRedirectHosts: ["kaesava.au", ".kaesava.au", "localhost", "127.0.0.1"],
    features: {
      premiumEnabled: false,
      partnerInvite: false,
      offlineSync: false,
      canAffordCalculator: true,
      foundingMemberPromo: true,
      aiAssistant: true,
      privateMode: true,
      fileNotes: true,
      simulation: true,
      customAllocationRules: true,
      reports: true,
      bankAccounts: true,
    },
  },
};

export function resolveAppConfig(appId: string): AppConfig | null {
  return REGISTRY[appId] || null;
}

export function resolveAppConfigOrDefault(appId?: string | null): AppConfig {
  if (appId && REGISTRY[appId]) {
    return REGISTRY[appId];
  }
  return REGISTRY[DEFAULT_APP_ID];
}

export function registerAppManifest(manifest: AppConfig): void {
  REGISTRY[manifest.id] = manifest;
}

export function listRegisteredApps(): AppConfig[] {
  return Object.values(REGISTRY);
}
