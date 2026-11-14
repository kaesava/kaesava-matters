import { z } from "zod";
import { SubscriptionStatusSchema } from "./subscription.types.js";

/**
 * Base audit schema inherited by all tenant-scoped database models.
 * Ensures metadata fields (IDs, audit timestamps, creator/updater user IDs) conform to strict UUID and Date types.
 */
export const BaseSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  appId: z.string().uuid(),
  createdAt: z.date(),
  createdBy: z.string().uuid(),
  updatedAt: z.date(),
  updatedBy: z.string().uuid(),
  archivedAt: z.date().nullable(),
}).strict();

/**
 * DTO summarizing tenant subscription status and trial lifecycle flags.
 */
export const SubscriptionStatusDto = z.object({
  status: SubscriptionStatusSchema,
  trialEndsAt: z.date().nullable(),
  subscriptionEndsAt: z.date().nullable(),
  gracePeriodEndsAt: z.date().nullable().optional(),
  isTrialActive: z.boolean(),
  isTrialExpired: z.boolean(),
  isGracePeriod: z.boolean().default(false),
  isSubscribed: z.boolean(),
  isPastDue: z.boolean(),
  isDeactivated: z.boolean(),
  daysRemainingInTrial: z.number().nullable(),
  cancelAtPeriodEnd: z.boolean().default(false),
  planType: z.enum(["monthly", "annual", "founding"]).nullable().optional(),
  nextBillingAt: z.date().nullable().optional(),
}).strict();
export type SubscriptionStatusDto = z.infer<typeof SubscriptionStatusDto>;

export const UpdateHouseholdMemberRoleCommand = z.object({
  memberId: z.string().uuid().optional(),
  targetUserId: z.string().uuid().optional(),
  newRole: z.enum(["OWNER", "MEMBER"]),
}).strict();
export type UpdateHouseholdMemberRoleCommandType = z.infer<typeof UpdateHouseholdMemberRoleCommand>;

/**
 * Application Version and Diagnostics DTO
 */
export interface AppVersionInfo {
  appId: string;
  appName: string;
  version: string;
  buildNumber: string;
  channel: "development" | "preview" | "beta" | "production";
  gitCommit: string;
  platform: "web" | "ios" | "android";
  formattedVersion: string;
}
