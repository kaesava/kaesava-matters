import { pgTable, uuid, varchar, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmCustomers } from "./tm_customer.js";
import { tmSites } from "./tm_site.js";
import { users } from "./user.js";

/**
 * Tradie Matters job entity tracking status workflow, scheduling, and unbilled extras flag.
 */
export const tmJobs = pgTable("tm_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobNumber: varchar("job_number", { length: 40 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("LEAD"),
  priority: varchar("priority", { length: 24 }).notNull().default("NORMAL"),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  siteId: uuid("site_id").references(() => tmSites.id),
  leadTradieUserId: uuid("lead_tradie_user_id").references(() => users.id),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  estimatedHours: numeric("estimated_hours", { precision: 8, scale: 2 }),
  quotedAmountExTax: numeric("quoted_amount_ex_tax", { precision: 12, scale: 2 }),
  targetMarginPct: numeric("target_margin_pct", { precision: 5, scale: 2 }),
  hasUnbilledExtras: boolean("has_unbilled_extras").notNull().default(false),
  purchaseOrderNumber: varchar("purchase_order_number", { length: 80 }),
  internalNotes: text("internal_notes"),
  ...tenantAndTimestamps,
});
