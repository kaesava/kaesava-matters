import { pgTable, uuid, varchar, boolean, numeric, integer } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Tradie Matters business profile settings scoped to a single tenant and app.
 */
export const tmBusinessProfiles = pgTable("tm_business_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  tradeType: varchar("trade_type", { length: 100 }).notNull().default("GENERAL"),
  abn: varchar("abn", { length: 32 }),
  gstRegistered: boolean("gst_registered").notNull().default(true),
  defaultTaxRatePercent: numeric("default_tax_rate_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("10.00"),
  quotePrefix: varchar("quote_prefix", { length: 20 }).notNull().default("Q-"),
  nextQuoteNumber: integer("next_quote_number").notNull().default(1),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("INV-"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
  defaultHourlyChargeRate: numeric("default_hourly_charge_rate", { precision: 10, scale: 2 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankBsb: varchar("bank_bsb", { length: 20 }),
  bankAccountNumber: varchar("bank_account_number", { length: 40 }),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
  defaultMaxCardAmount: numeric("default_max_card_amount", { precision: 12, scale: 2 }),
  ...tenantAndTimestamps,
});
