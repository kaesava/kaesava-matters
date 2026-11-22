/**
 * Feature Flags & Entitlements Management
 * 
 * Manages feature flags, ownership metadata, expiry timelines, and tenant-scoped runtime evaluations.
 */
import { resolveAppConfig, resolveAppConfigOrDefault } from "./app-registry.js";

/**
 * Feature flag metadata specification.
 */
export interface FeatureFlag {
  /** Unique key identifying the feature flag. */
  key: string;
  /** Team or engineering owner responsible for maintaining the flag. */
  owner: string;
  /** Expiration timeline string ('never' or ISO date). */
  expiresAt: string;
  /** Indicates if flag can be overridden per tenant scope. */
  tenantScopable: boolean;
  /** Emergency kill switch state to globally disable feature regardless of overrides. */
  killSwitchEnabled: boolean;
}

/**
 * Strongly typed registry of platform feature flags.
 */
const FEATURE_FLAGS = {
  premiumEnabled: {
    key: "premiumEnabled",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  partnerInvite: {
    key: "partnerInvite",
    owner: "product",
    expiresAt: "2026-12-31",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  offlineSync: {
    key: "offlineSync",
    owner: "engineering",
    expiresAt: "2026-12-31",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  foundingMemberPromo: {
    key: "foundingMemberPromo",
    owner: "product",
    expiresAt: "never",
    tenantScopable: false,
    killSwitchEnabled: false,
  },
  aiAssistant: {
    key: "aiAssistant",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  privateMode: {
    key: "privateMode",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  fileNotes: {
    key: "fileNotes",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  simulation: {
    key: "simulation",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  customAllocationRules: {
    key: "customAllocationRules",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
  reports: {
    key: "reports",
    owner: "product",
    expiresAt: "never",
    tenantScopable: true,
    killSwitchEnabled: false,
  },
} as const;


/**
 * Evaluates whether a specified feature flag is enabled for an application ID and optional tenant scope.
 *
 * @param flag - Feature flag key
 * @param appId - Target application UUID
 * @param tenantIdOrPremiumOverride - Optional tenant ID or boolean premium override
 * @param premiumEnabledOverride - Optional tenant-level override for premium entitlements
 * @returns True if feature is enabled, false otherwise
 */
export function isFeatureEnabled(
  flag: keyof typeof FEATURE_FLAGS,
  appId: string,
  tenantIdOrPremiumOverride?: string | boolean,
  premiumEnabledOverride = false
): boolean {
  if (FEATURE_FLAGS[flag]?.killSwitchEnabled) {
    return false;
  }

  const isPremiumOverride =
    typeof tenantIdOrPremiumOverride === "boolean"
      ? tenantIdOrPremiumOverride
      : premiumEnabledOverride;

  const appConfig = resolveAppConfig(appId);
  if (!appConfig) return false;

  if (flag === "premiumEnabled") {
    return appConfig.features.premiumEnabled || isPremiumOverride;
  }

  return Boolean(appConfig.features[flag]);
}

/**
 * Unifies static kill switches, AppManifest defaults, and live DB apps.feature_flags overrides.
 */
export function resolveEffectiveAppFlags(
  appId?: string | null,
  dbFeatureFlags?: Partial<Record<string, unknown>> | null
): Record<string, unknown> {
  const manifest = resolveAppConfigOrDefault(appId);
  const merged: Record<string, unknown> = {
    ...manifest.features,
    ...(dbFeatureFlags ?? {}),
  };

  for (const [key, meta] of Object.entries(FEATURE_FLAGS)) {
    if (meta.killSwitchEnabled) {
      merged[key] = false;
    }
  }

  return merged;
}

/**
 * Resolves Ring 3 app-specific feature flags validated by an app-owned Zod schema,
 * keeping Ring 1 & Ring 2 completely decoupled from app-specific flag keys.
 */
export function resolveTypedAppFlags<T>(
  appId: string | null | undefined,
  dbFeatureFlags: Partial<Record<string, unknown>> | null | undefined,
  schema: { parse: (input: unknown) => T }
): T {
  const effective = resolveEffectiveAppFlags(appId, dbFeatureFlags);
  const rawAppFlags =
    effective.appFlags && typeof effective.appFlags === "object"
      ? (effective.appFlags as Record<string, unknown>)
      : effective;
  return schema.parse(rawAppFlags);
}

