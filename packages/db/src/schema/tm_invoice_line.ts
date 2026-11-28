import { pgTable, uuid, varchar, integer, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmInvoices } from "./tm_invoice.js";
import { tmPricebookItems } from "./tm_pricebook_item.js";

/**
 * Line item belonging to a Tradie Matters invoice (immutable once invoice lockedAt is set).
 */
export const tmInvoiceLines = pgTable("tm_invoice_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => tmInvoices.id),
  sourceType: varchar("source_type", { length: 32 }).notNull().default("MANUAL"),
  sourceId: uuid("source_id"),
  pricebookItemId: uuid("pricebook_item_id").references(() => tmPricebookItems.id),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitCostExTax: numeric("unit_cost_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  unitSellPrice: numeric("unit_sell_price", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxCode: varchar("tax_code", { length: 24 }).notNull().default("GST"),
  lineTotalExTax: numeric("line_total_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lineTax: numeric("line_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lineTotalIncTax: numeric("line_total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...tenantAndTimestamps,
});
