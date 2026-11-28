import { pgTable, uuid, varchar, numeric, integer } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmVariations } from "./tm_variation.js";
import { tmPricebookItems } from "./tm_pricebook_item.js";

/**
 * Line item belonging to a Tradie Matters job variation.
 */
export const tmVariationLines = pgTable("tm_variation_lines", {
  id: uuid("id").defaultRandom().primaryKey(),
  variationId: uuid("variation_id")
    .notNull()
    .references(() => tmVariations.id),
  pricebookItemId: uuid("pricebook_item_id").references(() => tmPricebookItems.id),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitCostExTax: numeric("unit_cost_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  unitSellPriceExTax: numeric("unit_sell_price_ex_tax", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  taxCode: varchar("tax_code", { length: 32 }).notNull().default("GST"),
  lineTotalExTax: numeric("line_total_ex_tax", { precision: 12, scale: 2 })
    .notNull()
    .default("0.00"),
  sortOrder: integer("sort_order").notNull().default(0),
  ...tenantAndTimestamps,
});
