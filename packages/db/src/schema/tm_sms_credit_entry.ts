import { pgTable, uuid, integer, varchar } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmCommLogs } from "./tm_comm_log.js";

/**
 * Append-only SMS/MMS credit ledger entries per tenant.
 */
export const tmSmsCreditEntries = pgTable("tm_sms_credit_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  creditsDelta: integer("credits_delta").notNull(),
  reason: varchar("reason", { length: 40 }).notNull(),
  stripeCheckoutSessionId: varchar("stripe_checkout_session_id", { length: 255 }),
  commLogId: uuid("comm_log_id").references(() => tmCommLogs.id),
  ...tenantAndTimestamps,
});
