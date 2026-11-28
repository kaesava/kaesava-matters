import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_EXPIRED",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);

export const SubscriptionTierSchema = z.enum(["standard", "household", "team"]);

export const BillingCycleSchema = z.enum(["monthly", "annual", "founding"]);

export const PlanKeySchema = z.enum([
  "monthly",
  "annual",
  "founding",
  "solo_monthly",
  "solo_annual",
  "founding_crew_monthly",
  "founding_crew_annual",
  "small_crew_monthly",
  "small_crew_annual",
]);
export type PlanKey = z.infer<typeof PlanKeySchema>;

export function buildExportFileName(dateStr: string, appSlug = "workspace"): string {
  return `${appSlug}-backup-${dateStr}.zip`;
}
