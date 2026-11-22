import { DbOrTx, tenants } from "@kaesava/db/rings/platform";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { eq } from "drizzle-orm";

/**
 * Shared core guard asserting that a tenant has active trial or subscription access.
 */
export async function ensurePremiumAccess(
  db: DbOrTx,
  tenantId: string,
  featureName: string = "This feature",
  appId?: string | null
): Promise<void> {
  const [tenant] = await db
    .select({
      subscriptionStatus: tenants.subscriptionStatus,
      trialEndsAt: tenants.trialEndsAt,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) return;

  const now = new Date();
  const trialExpired = tenant.trialEndsAt ? new Date(tenant.trialEndsAt) < now : false;
  const isDeactivated = tenant.subscriptionStatus === "DEACTIVATED";
  const isExpired = tenant.subscriptionStatus === "TRIAL_EXPIRED" || (tenant.subscriptionStatus === "TRIAL_ACTIVE" && trialExpired);

  if (isExpired || isDeactivated) {
    const app = resolveAppConfigOrDefault(appId);
    throw new Error(`${featureName} requires an active subscription or unexpired ${app.trialDays}-day trial.`);
  }
}
