import { pgTable, uuid, varchar, numeric, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";
import { tmJobVisits } from "./tm_job_visit.js";
import { tmPricebookItems } from "./tm_pricebook_item.js";

/**
 * Field material or part usage logged against a job with immutable cost/sell snapshots.
 */
export const tmMaterialUsages = pgTable("tm_material_usages", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => tmJobs.id),
  visitId: uuid("visit_id").references(() => tmJobVisits.id),
  pricebookItemId: uuid("pricebook_item_id").references(() => tmPricebookItems.id),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitCostSnapshot: numeric("unit_cost_snapshot", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  unitSellPriceExTax: numeric("unit_sell_price_ex_tax", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  taxCode: varchar("tax_code", { length: 32 }).notNull().default("GST"),
  isBillable: boolean("is_billable").notNull().default(true),
  invoicedInInvoiceId: uuid("invoiced_in_invoice_id"),
  clientMutationId: varchar("client_mutation_id", { length: 120 }),
  ...tenantAndTimestamps,
});
