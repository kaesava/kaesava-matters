import { pgTable, uuid, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";

export interface PurchaseOrderLine {
  description: string;
  quantity: number;
  unitCostExTax: number;
}

/**
 * Purchase order sent to a supplier for a job, convertible to a supplier bill.
 */
export const tmPurchaseOrders = pgTable("tm_purchase_orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  poNumber: varchar("po_number", { length: 40 }).notNull(),
  jobId: uuid("job_id").references(() => tmJobs.id),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  supplierEmail: varchar("supplier_email", { length: 255 }),
  status: varchar("status", { length: 24 }).notNull().default("DRAFT"),
  linesJson: jsonb("lines_json").$type<PurchaseOrderLine[]>().notNull().default([]),
  notes: text("notes"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  ...tenantAndTimestamps,
});
