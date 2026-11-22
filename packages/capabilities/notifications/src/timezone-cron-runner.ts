import { Inngest } from "inngest";
import { db, tenants, tenantUsers, users, userPreferences, tenantUserPreferences } from "@money-matters/db/rings/capabilities";
import { eq, and, sql, inArray } from "drizzle-orm";
import { isLocalScheduleMatch, readNotificationPrefs, resolveNotificationRecipient } from "./helpers.js";

export interface TimezoneCronMemberRecord {
  tenantId: string;
  appId: string;
  tenantName: string;
  tenantCurrency: string;
  tenantTimezone: string;
  userId: string;
  email: string;
  notificationEmail: string | null;
  emailRecipient: string | null;
  hideAmountsInNotifications: boolean;
  userTimezone: string | null;
  appPreferences: Record<string, unknown>;
}

/**
 * Reusable hourly local-timezone notification cron runner for any multi-tenant app.
 * Filters tenants by appId, evaluates each member's local timezone schedule, and chunks batches.
 */
export function createTimezoneAwareNotificationCron(
  inngest: Inngest,
  config: {
    id: string;
    appId?: string;
    localHour: number;
    dayOfWeek?: number;
    chunkSize?: number;
    onProcessBatch: (batch: TimezoneCronMemberRecord[]) => Promise<void>;
  }
) {
  return inngest.createFunction(
    { id: config.id },
    { cron: "0 * * * *" },
    async ({ step }) => {
      const members = await step.run("fetch-matching-members", async () => {
        const filters = [
          sql`"tenants"."archived_at" IS NULL`,
          inArray(tenants.subscriptionStatus, ["TRIAL_ACTIVE", "SUBSCRIBED"]),
        ];
        if (config.appId) {
          filters.push(eq(tenants.appId, config.appId));
        }
        const rows = await db
          .select({
            tenantId: tenants.id,
            appId: tenants.appId,
            tenantName: tenants.name,
            tenantCurrency: tenants.currency,
            tenantTimezone: tenants.timezone,
            userId: users.id,
            email: users.email,
            notificationEmail: userPreferences.notificationEmail,
            hideAmountsInNotifications: userPreferences.hideAmountsInNotifications,
            userTimezone: userPreferences.timezone,
            appPreferences: tenantUserPreferences.appPreferences,
          })
          .from(tenants)
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
          .leftJoin(
            tenantUserPreferences,
            and(eq(tenantUserPreferences.userId, users.id), eq(tenantUserPreferences.tenantId, tenants.id))
          )
          .where(and(...filters));

        return rows
          .filter((m) => {
            const tz = m.userTimezone || m.tenantTimezone || "UTC";
            return isLocalScheduleMatch(tz, { hour: config.localHour, dayOfWeek: config.dayOfWeek });
          })
          .map((m) => ({
            ...m,
            emailRecipient: resolveNotificationRecipient(m.email, m.notificationEmail),
            hideAmountsInNotifications: Boolean(m.hideAmountsInNotifications),
            appPreferences: readNotificationPrefs(m.appPreferences, m.appId),
          }));
      });

      const chunkSize = config.chunkSize ?? 25;
      for (let i = 0; i < members.length; i += chunkSize) {
        const chunk = members.slice(i, i + chunkSize);
        await step.run(`process-batch-${Math.floor(i / chunkSize)}`, async () => {
          await config.onProcessBatch(chunk);
        });
      }

      return { processed: members.length };
    }
  );
}
