import { pgTable, uuid, varchar, text, integer, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Tradie Matters CRM customer record (residential, commercial, strata, or real estate).
 */
export const tmCustomers = pgTable("tm_customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("company_name", { length: 255 }),
  customerType: varchar("customer_type", { length: 32 }).notNull().default("RESIDENTIAL"),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 40 }),
  mobile: varchar("mobile", { length: 40 }),
  abn: varchar("abn", { length: 32 }),
  billingAddress: text("billing_address"),
  paymentTermsDays: integer("payment_terms_days"),
  creditBalance: numeric("credit_balance", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  ...tenantAndTimestamps,
});
