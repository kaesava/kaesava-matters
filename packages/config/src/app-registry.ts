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
  legalAddress?: string;
  notificationSettingsPath?: string;
  billingSettingsPath?: string;
  signInPath?: string;
}

export interface AppTerminologyConfig {
  tenantSingular: string;
  tenantPlural: string;
  memberSingular: string;
}

export interface AppRoleOption {
  key: string;
  label: string;
  baseRole: "OWNER" | "MEMBER" | "VIEWER";
  description?: string;
}

export interface AppBillingConfig {
  priceIds?: {
    monthly?: string;
    annual?: string;
    foundingAnnual?: string;
    [key: string]: string | undefined;
  };
}

export interface AppConfig {
  id: string;
  name: string;
  slug: string;
  trialDays: number;
  maxOwnedTenantsPerUser?: number;
  storageKeyPrefix?: string;
  authStoragePrefix?: string;
  easProjectId?: string;
  roles?: readonly AppRoleOption[];
  branding: AppBrandingConfig;
  terminology: AppTerminologyConfig;
  billing?: AppBillingConfig;
  allowedRedirectHosts: readonly string[];
  features: {
    premiumEnabled: boolean;
    memberInvite?: boolean;
    partnerInvite?: boolean;
    offlineSync: boolean;
    foundingMemberPromo: boolean;
    aiAssistant: boolean;
    privateMode: boolean;
    fileNotes: boolean;
    bankAccounts?: boolean;
    appFlags?: Record<string, unknown>;
    [key: string]: unknown;
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

export function resolveAppConfigOrThrow(appId?: string | null): AppConfig {
  const effectiveId = appId || process.env["DEFAULT_APP_ID"];
  if (effectiveId && REGISTRY[effectiveId]) {
    return REGISTRY[effectiveId];
  }
  throw new Error(`Unregistered or missing appId: ${effectiveId ?? "(none)"}. Register an AppManifest via registerAppManifest().`);
}

export function resolveAppConfigOrDefault(appId?: string | null): AppConfig {
  if (appId && REGISTRY[appId]) {
    return REGISTRY[appId];
  }
  const envDefault = process.env["DEFAULT_APP_ID"];
  if (envDefault && REGISTRY[envDefault]) {
    return REGISTRY[envDefault];
  }
  return REGISTRY[DEFAULT_APP_ID];
}

export function registerAppManifest(manifest: AppConfig): void {
  REGISTRY[manifest.id] = manifest;
}

export function listRegisteredApps(): AppConfig[] {
  return Object.values(REGISTRY);
}
