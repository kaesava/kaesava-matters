import { z } from "zod";
import { tenants, tenantUsers, apps, users, userAppTrials, userPreferences, type DbOrTx } from "@money-matters/db/rings/capabilities";
import { resolveAppConfigOrDefault } from "@money-matters/config";
import {
  CreateTenantCommand,
  COUNTRY_DEFAULTS,
  CURRENT_TERMS_VERSION,
  CURRENT_PRIVACY_VERSION,
  type TenantLifecycleHooks,
} from "@money-matters/types";
import { eq, and, isNull } from "drizzle-orm";

/**
 * Creates a new tenant scope and assigns the creator user as OWNER.
 * Domain-specific workspace seeding is delegated via optional TenantLifecycleHooks.
 */
export function createTenantHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (
    input: z.infer<typeof CreateTenantCommand>,
    appId: string,
    userId: string,
    userEmail?: string,
    displayName?: string
  ) => {
    const tenantId = crypto.randomUUID();
    const now = new Date();
    const appConfig = resolveAppConfigOrDefault(appId);
    const trialStartedAt = now;
    const trialEndsAt = new Date(now.getTime() + appConfig.trialDays * 24 * 60 * 60 * 1000);
    const derivedName = input.name.replace(/'s Household$/i, "").trim();
    const resolvedDisplayName =
      input.displayName?.trim() ||
      displayName?.trim() ||
      (derivedName && derivedName !== "My Household" ? derivedName : "User");

    await db
      .insert(apps)
      .values({ id: appId, name: appConfig.name, slug: appConfig.slug })
      .onConflictDoNothing();

    await db
      .insert(users)
      .values({
        id: userId,
        email: userEmail || `user-${userId.substring(0, 8)}@${appConfig.branding.primaryDomain}`,
        displayName: resolvedDisplayName,
        termsAcceptedAt: now,
        termsVersion: CURRENT_TERMS_VERSION,
        privacyVersion: CURRENT_PRIVACY_VERSION,
      })
      .onConflictDoNothing();

    if (input.displayName?.trim()) {
      await db
        .update(users)
        .set({
          displayName: input.displayName.trim(),
          termsAcceptedAt: now,
          termsVersion: CURRENT_TERMS_VERSION,
          privacyVersion: CURRENT_PRIVACY_VERSION,
          updatedAt: now,
        })
        .where(eq(users.id, userId));
    }

    const maxOwnedTenants = appConfig.maxOwnedTenantsPerUser ?? 1;
    if (Number.isFinite(maxOwnedTenants)) {
      const ownedTenants = await db
        .select({ id: tenantUsers.tenantId })
        .from(tenantUsers)
        .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
        .where(
          and(
            eq(tenantUsers.userId, userId),
            eq(tenantUsers.role, "OWNER"),
            eq(tenants.appId, appId),
            isNull(tenantUsers.archivedAt),
            isNull(tenants.archivedAt)
          )
        )
        .limit(maxOwnedTenants);

      if (ownedTenants.length >= maxOwnedTenants) {
        const tenantLabel = appConfig.terminology.tenantSingular.toLowerCase();
        if (maxOwnedTenants === 1) {
          throw new Error(
            `You already have an active ${tenantLabel}. An account can only own one active ${tenantLabel} at a time.`
          );
        }
        throw new Error(
          `You already have the maximum number of active ${tenantLabel}s (${maxOwnedTenants}).`
        );
      }
    }

    const existingTrials = await db
      .select({ id: userAppTrials.id, firstTrialStartedAt: userAppTrials.firstTrialStartedAt })
      .from(userAppTrials)
      .where(and(eq(userAppTrials.userId, userId), eq(userAppTrials.appId, appId)))
      .limit(1);

    const hasUsedTrial = existingTrials.length > 0;
    const subscriptionStatus = hasUsedTrial ? "TRIAL_EXPIRED" : "TRIAL_ACTIVE";

    const country = input.country || "AU";
    const countryDefaults =
      (COUNTRY_DEFAULTS as Record<string, { currency: string; timezone: string; phoneCountryCode: string }>)[country] ||
      COUNTRY_DEFAULTS["AU"];
    const currency = input.currency || countryDefaults.currency;
    const timezone = input.timezone || countryDefaults.timezone;

    await db.insert(tenants).values({
      id: tenantId,
      appId,
      name: input.name,
      country,
      currency,
      timezone,
      subscriptionStatus,
      trialStartedAt: hasUsedTrial ? null : trialStartedAt,
      trialEndsAt: hasUsedTrial ? null : trialEndsAt,
      cancelAtPeriodEnd: false,
      createdBy: userId,
      updatedBy: userId,
    });

    if (!hasUsedTrial) {
      await db
        .insert(userAppTrials)
        .values({
          userId,
          appId,
          firstTrialStartedAt: trialStartedAt,
          createdBy: userId,
          updatedBy: userId,
        })
        .onConflictDoNothing();
    }

    await db.insert(tenantUsers).values({
      tenantId,
      userId,
      role: "OWNER" as const,
      inviteStatus: "ACCEPTED" as const,
      createdBy: userId,
      updatedBy: userId,
    });

    const phoneCountryCode = countryDefaults.phoneCountryCode || "+61";
    const [existingPref] = await db
      .select()
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1);

    if (existingPref) {
      await db
        .update(userPreferences)
        .set({
          timezone,
          phoneCountryCode: existingPref.phoneCountryCode || phoneCountryCode,
          updatedAt: now,
          updatedBy: userId,
        })
        .where(eq(userPreferences.id, existingPref.id));
    } else {
      await db
        .insert(userPreferences)
        .values({
          userId,
          timezone,
          phoneCountryCode,
          createdBy: userId,
          updatedBy: userId,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }

    await hooks?.onTenantCreated?.({ db, tenantId, appId, userId, userEmail });

    return { success: true, tenantId };
  };
}

/**
 * Fetches tenant details, member users, and optional domain-enriched relations via hooks.
 */
export function getTenantHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (tenantId: string, appId: string) => {
    const [tenant] = await db
      .select()
      .from(tenants)
      .where(and(eq(tenants.id, tenantId), eq(tenants.appId, appId), isNull(tenants.archivedAt)))
      .limit(1);

    if (!tenant) return null;

    const tenantMemberList = await db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenant.id), isNull(tenantUsers.archivedAt)));

    const enriched = (await hooks?.onEnrichTenantDetails?.({ db, tenantId: tenant.id, appId })) ?? {};

    return {
      ...tenant,
      users: tenantMemberList,
      ...enriched,
    };
  };
}
