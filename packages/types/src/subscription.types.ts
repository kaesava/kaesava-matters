import { z } from "zod";

export const SubscriptionStatusSchema = z.enum([
  "TRIAL_ACTIVE",
  "TRIAL_EXPIRED",
  "SUBSCRIBED",
  "PAST_DUE",
  "DEACTIVATED",
]);

export const SubscriptionTierSchema = z.enum(["household"]);

export const BillingCycleSchema = z.enum(["monthly", "annual", "founding"]);

export function buildExportFileName(dateStr: string): string {
  return `money-matters-backup-${dateStr}.zip`;
}
