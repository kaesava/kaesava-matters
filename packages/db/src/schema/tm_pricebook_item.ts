import { pgTable, uuid, varchar, text, numeric, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Tradie Matters pricebook item (materials, labour, equipment, subcontract) with markup and search aliases.
 */
export const tmPricebookItems = pgTable("tm_pricebook_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  sku: varchar("sku", { length: 80 }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  itemType: varchar("item_type", { length: 32 }).notNull().default("MATERIAL"),
  category: varchar("category", { length: 100 }),
  unitOfMeasure: varchar("unit_of_measure", { length: 32 }).notNull().default("EACH"),
  searchAliases: text("search_aliases"),
  unitCostExTax: numeric("unit_cost_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  markupPct: numeric("markup_pct", { precision: 7, scale: 2 }).notNull().default("0.00"),
  sellPriceExTax: numeric("sell_price_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxCode: varchar("tax_code", { length: 32 }).notNull().default("GST"),
  isFavourite: boolean("is_favourite").notNull().default(false),
  supplierName: varchar("supplier_name", { length: 255 }),
  ...tenantAndTimestamps,
});
