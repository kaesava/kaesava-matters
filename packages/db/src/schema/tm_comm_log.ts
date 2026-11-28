import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Outbound and inbound communication audit log for quotes, invoices, and jobs.
 */
export const tmCommLogs = pgTable("tm_comm_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  channel: varchar("channel", { length: 24 }).notNull().default("EMAIL"),
  direction: varchar("direction", { length: 16 }).notNull().default("OUTBOUND"),
  recipient: varchar("recipient", { length: 255 }),
  subject: varchar("subject", { length: 255 }),
  bodyPreview: text("body_preview"),
  status: varchar("status", { length: 32 }).notNull().default("SENT"),
  sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
