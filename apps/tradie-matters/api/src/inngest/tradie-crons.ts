import type { Inngest } from "inngest";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { createDbClient, sendEmail } from "@kaesava/core";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import {
  tmAccountingConnections,
  tmBusinessProfiles,
  tmCommLogs,
  tmCustomers,
  tmInvoices,
  tmJobs,
  tmJobVisits,
  tmQuotes,
} from "@kaesava/db/rings/tradie-matters";
import { sendReviewBoosterCommand } from "@tradie-matters/capability-integrations";
import {
  findInvoicesDueForChasingQuery,
  findQuotesDueForFollowUpQuery,
} from "@tradie-matters/capability-operations";

export function createTradieCronFunctions(inngest: Inngest) {
  const quoteFollowUpCron = inngest.createFunction(
    { id: "tm-quote-followup-cron" },
    { cron: "0 * * * *" },
    async () => {
      const db = createDbClient();
      const dueQuotes = await findQuotesDueForFollowUpQuery(db);
      const now = new Date();
      let sent = 0;
      for (const q of dueQuotes) {
        if (!q.sentAt) continue;
        const [profile] = await db
          .select()
          .from(tmBusinessProfiles)
          .where(and(eq(tmBusinessProfiles.tenantId, q.tenantId), eq(tmBusinessProfiles.appId, q.appId)))
          .limit(1);
        const stages = Array.isArray((profile as { quoteFollowUpDaysJson?: number[] } | undefined)?.quoteFollowUpDaysJson)
          ? ((profile as { quoteFollowUpDaysJson: number[] }).quoteFollowUpDaysJson)
          : [3, 7];
        const daysSinceSent = Math.floor((now.getTime() - new Date(q.sentAt).getTime()) / 86400000);
        const lastStage = (q as { lastFollowUpStage?: number | null }).lastFollowUpStage ?? null;
        const stage = stages.find((d) => daysSinceSent >= d && (lastStage === null || d > lastStage));
        if (stage === undefined) continue;

        const [customer] = await db
          .select()
          .from(tmCustomers)
          .where(eq(tmCustomers.id, q.customerId))
          .limit(1);
        const targetEmail = customer?.email ?? null;
        const appConfig = resolveAppConfigOrDefault(q.appId);
        const portalUrl = q.portalTokenEnc ? `${appConfig.branding.appUrl}/q/${q.portalTokenEnc}` : appConfig.branding.appUrl;
        const subject = `Follow-up: Quote ${q.quoteNumber}`;
        let commStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED";

        if (targetEmail) {
          try {
            const res = await sendEmail({
              to: targetEmail,
              subject,
              html: `<p>Hi ${customer?.name ?? "there"},</p><p>Just following up on Quote <strong>${q.quoteNumber}</strong> (${q.title}) for <strong>$${q.totalIncTax}</strong>.</p><p><a href="${portalUrl}">View &amp; Accept Quote</a></p>`,
              text: `Hi ${customer?.name ?? "there"},\n\nJust following up on Quote ${q.quoteNumber} (${q.title}) for $${q.totalIncTax}.\n\nView here: ${portalUrl}`,
              appId: q.appId,
            });
            commStatus = res.success ? "SENT" : "FAILED";
          } catch {
            commStatus = "FAILED";
          }
        }

        await db
          .update(tmQuotes)
          .set({ followUpSentAt: now, updatedAt: now })
          .where(eq(tmQuotes.id, q.id));

        await db.insert(tmCommLogs).values({
          id: crypto.randomUUID(),
          entityType: "QUOTE",
          entityId: q.id,
          channel: "EMAIL",
          direction: "OUTBOUND",
          recipient: targetEmail,
          subject,
          bodyPreview: `Automated ${stage}-day quote follow-up`,
          status: commStatus,
          sentAt: commStatus === "SENT" ? now : undefined,
          tenantId: q.tenantId,
          appId: q.appId,
          createdAt: now,
          createdBy: q.createdBy,
          updatedAt: now,
          updatedBy: q.createdBy,
        });
        if (commStatus === "SENT") sent++;
      }
      return { processed: sent };
    }
  );

  const invoiceChasingCron = inngest.createFunction(
    { id: "tm-invoice-chasing-cron" },
    { cron: "0 * * * *" },
    async () => {
      const db = createDbClient();
      const today = new Date().toISOString().slice(0, 10);
      const dueInvoices = await findInvoicesDueForChasingQuery(db, today);
      const now = new Date();
      let chased = 0;
      for (const inv of dueInvoices) {
        if (inv.status === "PAID" || inv.status === "DISPUTED") continue;
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
        const stage = inv.chasingScheduleDaysJson.find(
          (d) => daysOverdue >= d && (inv.lastChasedStage === null || d > inv.lastChasedStage)
        );
        if (stage === undefined) continue;

        const [customer] = await db
          .select()
          .from(tmCustomers)
          .where(eq(tmCustomers.id, inv.customerId))
          .limit(1);
        const targetEmail = customer?.email ?? null;
        const subject = `Payment reminder: ${inv.documentTitle} ${inv.invoiceNumber}`;
        let commStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED";

        if (targetEmail) {
          try {
            const res = await sendEmail({
              to: targetEmail,
              subject,
              html: `<p>Hi ${customer?.name ?? "there"},</p><p>This is a friendly reminder for ${inv.documentTitle.toLowerCase()} <strong>${inv.invoiceNumber}</strong> with balance due <strong>$${inv.balanceDue}</strong>.</p>`,
              text: `Hi ${customer?.name ?? "there"},\n\nThis is a friendly reminder for ${inv.documentTitle.toLowerCase()} ${inv.invoiceNumber} with balance due $${inv.balanceDue}.`,
              appId: inv.appId,
            });
            commStatus = res.success ? "SENT" : "FAILED";
          } catch {
            commStatus = "FAILED";
          }
        }

        await db
          .update(tmInvoices)
          .set({ lastChasedStage: stage, status: daysOverdue > 0 ? "OVERDUE" : inv.status, updatedAt: now })
          .where(eq(tmInvoices.id, inv.id));
        await db.insert(tmCommLogs).values({
          id: crypto.randomUUID(),
          entityType: "INVOICE",
          entityId: inv.id,
          channel: "EMAIL",
          direction: "OUTBOUND",
          recipient: targetEmail,
          subject,
          bodyPreview: `Automated reminder stage ${stage} days`,
          status: commStatus,
          sentAt: commStatus === "SENT" ? now : undefined,
          tenantId: inv.tenantId,
          appId: inv.appId,
          createdAt: now,
          createdBy: inv.createdBy,
          updatedAt: now,
          updatedBy: inv.createdBy,
        });
        chased++;
      }
      return { processed: chased };
    }
  );

  const appointmentReminderCron = inngest.createFunction(
    { id: "tm-appointment-reminder-cron" },
    { cron: "0 * * * *" },
    async () => {
      const db = createDbClient();
      const now = new Date();
      const windowStart = new Date(now.getTime() + 23 * 3600000);
      const windowEnd = new Date(now.getTime() + 25 * 3600000);
      const upcomingVisits = await db
        .select()
        .from(tmJobVisits)
        .where(
          and(
            gte(tmJobVisits.scheduledStart, windowStart),
            lte(tmJobVisits.scheduledStart, windowEnd),
            isNull(tmJobVisits.archivedAt)
          )
        );
      let sent = 0;
      for (const visit of upcomingVisits) {
        const [job] = await db.select().from(tmJobs).where(eq(tmJobs.id, visit.jobId)).limit(1);
        if (!job) continue;
        const [customer] = await db.select().from(tmCustomers).where(eq(tmCustomers.id, job.customerId)).limit(1);
        if (!customer?.email) continue;
        try {
          const res = await sendEmail({
            to: customer.email,
            subject: `Appointment Reminder: ${job.title}`,
            html: `<p>Hi ${customer.name},</p><p>Reminder: your appointment for <strong>${job.title}</strong> is scheduled for ${new Date(visit.scheduledStart).toLocaleString("en-AU")}.</p>`,
            text: `Hi ${customer.name},\n\nReminder: your appointment for ${job.title} is scheduled for ${new Date(visit.scheduledStart).toLocaleString("en-AU")}.`,
            appId: visit.appId,
          });
          if (res.success) sent++;
        } catch {
          // ignore individual failure
        }
      }
      return { sent };
    }
  );

  const accountingSyncCron = inngest.createFunction(
    { id: "tm-accounting-sync-cron" },
    { cron: "0 * * * *" },
    async () => {
      const db = createDbClient();
      const connections = await db
        .select()
        .from(tmAccountingConnections)
        .where(isNull(tmAccountingConnections.archivedAt));
      const now = new Date();
      for (const conn of connections) {
        await db
          .update(tmAccountingConnections)
          .set({ lastSyncedAt: now, updatedAt: now })
          .where(eq(tmAccountingConnections.id, conn.id));
      }
      return { syncedConnections: connections.length };
    }
  );

  const reviewBoosterCron = inngest.createFunction(
    { id: "tm-review-booster-cron" },
    { cron: "0 11 * * *" },
    async () => {
      const db = createDbClient();
      const paidInvoices = await db
        .select()
        .from(tmInvoices)
        .where(eq(tmInvoices.status, "PAID"));
      let sent = 0;
      for (const inv of paidInvoices.slice(0, 25)) {
        await sendReviewBoosterCommand(
          db,
          { tenantId: inv.tenantId, appId: inv.appId, userId: inv.createdBy },
          { jobId: inv.jobId, invoiceId: inv.id, customerId: inv.customerId }
        );
        sent++;
      }
      return { sent };
    }
  );

  return [quoteFollowUpCron, invoiceChasingCron, appointmentReminderCron, accountingSyncCron, reviewBoosterCron];
}
