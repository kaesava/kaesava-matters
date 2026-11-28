import { pgTable, uuid, varchar, integer, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmQuotes } from "./tm_quote.js";
import { tmQuoteOptionGroups } from "./tm_quote_option_group.js";
import { tmPricebookItems } from "./tm_pricebook_item.js";

/**
 * Line item within a Tradie Matters quote (optionally scoped to an option group).
 */
export const tmQuoteLines = pgTable("tm_quote_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => tmQuotes.id),
  optionGroupId: uuid("option_group_id").references(() => tmQuoteOptionGroups.id),
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
