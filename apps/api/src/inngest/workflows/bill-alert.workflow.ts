import { Inngest } from "inngest";
import {
  db,
  expenseEvents,
  envelopes,
  bankAccounts,
  getEnvelopeBalancesMap,
  tenants,
  tenantUsers,
  users,
  userPreferences,
  tenantUserPreferences,
} from "@kaesava/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { sendNotificationEmail, todayInZone, getLocalHourInZone, formatCurrency } from "@kaesava/core";
import { t } from "@kaesava/i18n";
import { isChannelEnabled, readNotificationPrefs, resolveNotificationRecipient } from "@kaesava/capability-notifications";

function addDaysToIsoDate(isoDate: string, days: number): string {
  const dt = new Date(`${isoDate}T12:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export function createBillAlertWorkflow(inngest: Inngest) {
  return inngest.createFunction(
    { id: "notify-bill-shortfall-alert" },
    { cron: "0 * * * *" }, // Hourly check for local 8:00 AM delivery, 2 days before due date
    async ({ step }) => {
      const dueSoonBills = await step.run("fetch-due-soon-bills", async () => {
        const rows = await db
          .select({
            eventId: expenseEvents.id,
            billName: expenseEvents.name,
            dueDate: expenseEvents.expectedDate,
            amount: expenseEvents.expectedAmount,
            envelopeId: envelopes.id,
            envelopeName: envelopes.name,
            envelopeIsPrivate: envelopes.isPrivate,
            envelopeOwnerId: envelopes.userId,
            bankIsPrivate: bankAccounts.isPrivate,
            bankOwnerId: bankAccounts.userId,
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
          .from(expenseEvents)
          .innerJoin(envelopes, eq(expenseEvents.envelopeId, envelopes.id))
          .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
          .innerJoin(tenants, eq(expenseEvents.tenantId, tenants.id))
          .innerJoin(tenantUsers, and(eq(tenantUsers.tenantId, tenants.id), sql`"tenant_users"."archived_at" IS NULL`))
          .innerJoin(users, eq(tenantUsers.userId, users.id))
          .leftJoin(userPreferences, eq(userPreferences.userId, users.id))
          .leftJoin(
            tenantUserPreferences,
            and(
              eq(tenantUserPreferences.userId, users.id),
              eq(tenantUserPreferences.tenantId, tenants.id)
            )
          )
          .where(
            and(
              sql`"expense_events"."archived_at" IS NULL`,
              sql`"envelopes"."archived_at" IS NULL`,
              sql`"tenants"."archived_at" IS NULL`,
              inArray(tenants.subscriptionStatus, ["TRIAL_ACTIVE", "SUBSCRIBED"]),
              eq(expenseEvents.status, "PENDING")
            )
          );

        return rows.filter((item) => {
          if (item.envelopeIsPrivate && item.envelopeOwnerId && item.envelopeOwnerId !== item.userId) {
            return false;
          }
          if (item.bankIsPrivate && item.bankOwnerId && item.bankOwnerId !== item.userId) {
            return false;
          }
          const prefs = readNotificationPrefs(item.appPreferences, item.appId);
          const emailOn = isChannelEnabled(prefs, "bill_alerts_email", "bill_alerts_enabled");
          const pushOn = isChannelEnabled(prefs, "bill_alerts_push", "bill_alerts_enabled");
          if (!emailOn && !pushOn) return false;

          const tz = item.userTimezone || item.tenantTimezone || "UTC";
          if (getLocalHourInZone(tz) !== 8) return false;
          const targetDate = addDaysToIsoDate(todayInZone(tz), 2);
          return item.dueDate === targetDate;
        });
      });

      if (dueSoonBills.length === 0) {
        return { alertsSent: 0 };
      }

      const balancesByTenant = await step.run("fetch-bill-envelope-balances", async () => {
        const map: Record<string, Record<string, number>> = {};
        const seen = new Set<string>();
        for (const row of dueSoonBills) {
          if (seen.has(row.tenantId)) continue;
          seen.add(row.tenantId);
          map[row.tenantId] = await getEnvelopeBalancesMap(row.tenantId, row.appId, db);
        }
        return map;
      });

      let alertsSent = 0;
      for (const item of dueSoonBills) {
        const billAmount = parseFloat(item.amount || "0");
        const envelopeBalance = balancesByTenant[item.tenantId]?.[item.envelopeId] ?? 0;
        const shortfall = Number((billAmount - envelopeBalance).toFixed(2));
        if (shortfall <= 0.005) continue;

        await step.run(`send-bill-shortfall-${item.eventId}-${item.userId}`, async () => {
          const cur = item.tenantCurrency || "AUD";
          const hideAmounts = Boolean(item.hideAmountsInNotifications);
          const masked = t("notifications.settings.maskedAmountText");
          const formattedBill = hideAmounts ? masked : formatCurrency(billAmount, { currency: cur });
          const formattedBal = hideAmounts ? masked : formatCurrency(envelopeBalance, { currency: cur });
          const formattedShortfall = hideAmounts ? masked : formatCurrency(shortfall, { currency: cur });
          const prefs = readNotificationPrefs(item.appPreferences, item.appId);
          const emailEnabled = isChannelEnabled(prefs, "bill_alerts_email", "bill_alerts_enabled");
          const pushEnabled = isChannelEnabled(prefs, "bill_alerts_push", "bill_alerts_enabled");
          const emailRecipient = resolveNotificationRecipient(item.email, item.notificationEmail);

          if (emailEnabled && emailRecipient) {
            await sendNotificationEmail(
              emailRecipient,
              `Upcoming Bill Shortfall — ${item.billName}`,
              hideAmounts
                ? `Your bill "${item.billName}" is due in 2 days (${item.dueDate}) and its envelope "${item.envelopeName}" has a shortfall (${masked}).\n\nOpen Money Matters to top up your envelope before the due date.`
                : `Your bill "${item.billName}" (${formattedBill}) is due in 2 days (${item.dueDate}).\n\n` +
                  `• Envelope: ${item.envelopeName}\n` +
                  `• Current Balance: ${formattedBal}\n` +
                  `• Shortfall: ${formattedShortfall}\n\n` +
                  `Open Money Matters to top up your envelope before the due date.`
            );
          }

          if (pushEnabled) {
            await inngest.send({
              name: "notification/send-push",
              data: {
                userId: item.userId,
                tenantId: item.tenantId,
                title: `Upcoming Bill Shortfall: ${item.billName}`,
                body: hideAmounts
                  ? `Due ${item.dueDate}. ${item.envelopeName} has a shortfall (${masked}).`
                  : `Due ${item.dueDate} (${formattedBill}). ${item.envelopeName} is short by ${formattedShortfall}.`,
                data: { route: "/(app)/envelopes" },
              },
            }).catch(() => {});
          }
        });
        alertsSent++;
      }

      return { alertsSent };
    }
  );
}
