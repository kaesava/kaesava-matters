import { pgTable, uuid, varchar, boolean, numeric, integer, text, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { fileNotes } from "./file_note.js";

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
  defaultGstMode: varchar("default_gst_mode", { length: 16 }).notNull().default("EXCLUSIVE"),
  quotePrefix: varchar("quote_prefix", { length: 20 }).notNull().default("Q-"),
  nextQuoteNumber: integer("next_quote_number").notNull().default(1),
  invoicePrefix: varchar("invoice_prefix", { length: 20 }).notNull().default("INV-"),
  nextInvoiceNumber: integer("next_invoice_number").notNull().default(1),
  defaultPaymentTermsDays: integer("default_payment_terms_days").notNull().default(14),
  defaultHourlyChargeRate: numeric("default_hourly_charge_rate", { precision: 10, scale: 2 }),
  defaultCallOutFee: numeric("default_call_out_fee", { precision: 10, scale: 2 }),
  defaultMarkupPct: numeric("default_markup_pct", { precision: 5, scale: 2 }).notNull().default("20.00"),
  defaultSuperRatePercent: numeric("default_super_rate_percent", { precision: 5, scale: 2 })
    .notNull()
    .default("12.00"),
  targetMarginPct: numeric("target_margin_pct", { precision: 5, scale: 2 }).notNull().default("30.00"),
  payIdType: varchar("pay_id_type", { length: 16 }),
  payIdValue: varchar("pay_id_value", { length: 255 }),
  bankAccountName: varchar("bank_account_name", { length: 255 }),
  bankBsb: varchar("bank_bsb", { length: 20 }),
  bankAccountNumber: varchar("bank_account_number", { length: 40 }),
  logoFileNoteId: uuid("logo_file_note_id").references(() => fileNotes.id),
  stripeAccountId: varchar("stripe_account_id", { length: 255 }),
  stripeChargesEnabled: boolean("stripe_charges_enabled").notNull().default(false),
  payToEnabled: boolean("pay_to_enabled").notNull().default(false),
  defaultMaxCardAmount: numeric("default_max_card_amount", { precision: 12, scale: 2 }),
  quoteFollowUpDaysJson: jsonb("quote_follow_up_days_json").$type<number[]>().notNull().default([2, 5, 10]),
  googleReviewUrl: text("google_review_url"),
  supplierInboxSlug: varchar("supplier_inbox_slug", { length: 80 }),
  ...tenantAndTimestamps,
});
