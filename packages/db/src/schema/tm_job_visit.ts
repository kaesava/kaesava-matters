import { pgTable, uuid, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";

/**
 * Scheduled or field-executed visit on a Tradie Matters job with GPS check-in/out coordinates.
 */
export const tmJobVisits = pgTable("tm_job_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => tmJobs.id),
  title: varchar("title", { length: 255 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("SCHEDULED"),
  scheduledStart: timestamp("scheduled_start", { withTimezone: true }).notNull(),
  scheduledEnd: timestamp("scheduled_end", { withTimezone: true }).notNull(),
  actualCheckInAt: timestamp("actual_check_in_at", { withTimezone: true }),
  actualCheckOutAt: timestamp("actual_check_out_at", { withTimezone: true }),
  checkInLat: numeric("check_in_lat", { precision: 10, scale: 7 }),
  checkInLng: numeric("check_in_lng", { precision: 10, scale: 7 }),
  checkOutLat: numeric("check_out_lat", { precision: 10, scale: 7 }),
  checkOutLng: numeric("check_out_lng", { precision: 10, scale: 7 }),
  visitNotes: text("visit_notes"),
  clientMutationId: varchar("client_mutation_id", { length: 120 }),
  ...tenantAndTimestamps,
});
