import { pgTable, uuid, varchar, text, integer, numeric, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmQuotes } from "./tm_quote.js";

/**
 * Good / Better / Best option group belonging to a Tradie Matters quote.
 */
export const tmQuoteOptionGroups = pgTable("tm_quote_option_groups", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteId: uuid("quote_id")
    .notNull()
    .references(() => tmQuotes.id),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isRecommended: boolean("is_recommended").notNull().default(false),
  isSelected: boolean("is_selected").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  subtotalExTax: numeric("subtotal_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  ...tenantAndTimestamps,
});
