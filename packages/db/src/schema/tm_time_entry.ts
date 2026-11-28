import { pgTable, uuid, varchar, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";
import { tmJobVisits } from "./tm_job_visit.js";
import { users } from "./user.js";

/**
 * Billable or non-billable field time entry with immutable hourly cost/charge rate snapshots.
 */
export const tmTimeEntries = pgTable("tm_time_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => tmJobs.id),
  visitId: uuid("visit_id").references(() => tmJobVisits.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  durationMinutes: integer("duration_minutes").notNull().default(0),
  isBillable: boolean("is_billable").notNull().default(true),
  hourlyCostSnapshot: numeric("hourly_cost_snapshot", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  hourlyChargeSnapshot: numeric("hourly_charge_snapshot", { precision: 10, scale: 2 })
    .notNull()
    .default("0.00"),
  invoicedInInvoiceId: uuid("invoiced_in_invoice_id"),
  notes: text("notes"),
  clientMutationId: varchar("client_mutation_id", { length: 120 }),
  ...tenantAndTimestamps,
});
