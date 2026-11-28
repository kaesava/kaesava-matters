import type { Inngest } from "inngest";
import { eq, isNull } from "drizzle-orm";
import { createDbClient } from "@kaesava/core";
import {
  tmAccountingConnections,
  tmCommLogs,
  tmInvoices,
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
    { cron: "0 9 * * *" },
    async () => {
      const db = createDbClient();
      const cutoff = new Date(Date.now() - 3 * 86400000);
      const dueQuotes = await findQuotesDueForFollowUpQuery(db, cutoff);
      const now = new Date();
      for (const q of dueQuotes) {
        await db.update(tmQuotes).set({ followUpSentAt: now, updatedAt: now }).where(eq(tmQuotes.id, q.id));
        await db.insert(tmCommLogs).values({
          id: crypto.randomUUID(),
          entityType: "QUOTE",
          entityId: q.id,
          channel: "EMAIL",
          direction: "OUTBOUND",
          subject: `Follow-up: Quote ${q.quoteNumber}`,
          bodyPreview: "Automated 3-day quote follow-up",
          status: "SENT",
          sentAt: now,
          tenantId: q.tenantId,
          appId: q.appId,
          createdAt: now,
          createdBy: q.createdBy,
          updatedAt: now,
          updatedBy: q.createdBy,
        });
      }
      return { processed: dueQuotes.length };
    }
  );

  const invoiceChasingCron = inngest.createFunction(
    { id: "tm-invoice-chasing-cron" },
    { cron: "0 10 * * *" },
    async () => {
      const db = createDbClient();
      const today = new Date().toISOString().slice(0, 10);
      const dueInvoices = await findInvoicesDueForChasingQuery(db, today);
      const now = new Date();
      let chased = 0;
      for (const inv of dueInvoices) {
        const daysOverdue = Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / 86400000);
        const stage = inv.chasingScheduleDaysJson.find(
          (d) => daysOverdue >= d && (inv.lastChasedStage === null || d > inv.lastChasedStage)
        );
        if (stage === undefined) continue;
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
          subject: `Payment reminder: ${inv.documentTitle} ${inv.invoiceNumber}`,
          bodyPreview: `Automated reminder stage ${stage} days`,
          status: "SENT",
          sentAt: now,
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

  return [quoteFollowUpCron, invoiceChasingCron, accountingSyncCron, reviewBoosterCron];
}
