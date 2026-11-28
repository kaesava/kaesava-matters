import { pgTable, uuid, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";

/**
 * Job scope variation / change order requiring customer approval.
 */
export const tmVariations = pgTable("tm_variations", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => tmJobs.id),
  variationNumber: varchar("variation_number", { length: 40 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
  totalExTax: numeric("total_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByName: varchar("approved_by_name", { length: 255 }),
  ...tenantAndTimestamps,
});
