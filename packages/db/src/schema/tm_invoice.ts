import { pgTable, uuid, varchar, text, integer, numeric, boolean, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmCustomers } from "./tm_customer.js";
import { tmSites } from "./tm_site.js";
import { tmJobs } from "./tm_job.js";
import { tmQuotes } from "./tm_quote.js";
import { fileNotes } from "./file_note.js";

/**
 * Tradie Matters ATO-compliant invoice (Deposit, Progress, Final) with locking, chasing, and Stripe portal config.
 */
export const tmInvoices = pgTable("tm_invoices", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceNumber: varchar("invoice_number", { length: 40 }).notNull(),
  invoiceType: varchar("invoice_type", { length: 24 }).notNull().default("FINAL"),
  status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  siteId: uuid("site_id").references(() => tmSites.id),
  jobId: uuid("job_id").references(() => tmJobs.id),
  quoteId: uuid("quote_id").references(() => tmQuotes.id),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date").notNull(),
  gstRegisteredSnapshot: boolean("gst_registered_snapshot").notNull().default(true),
  documentTitle: varchar("document_title", { length: 40 }).notNull().default("Tax Invoice"),
  subtotalExTax: numeric("subtotal_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull().default("0.00"),
  creditApplied: numeric("credit_applied", { precision: 12, scale: 2 }).notNull().default("0.00"),
  balanceDue: numeric("balance_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
  lockedAt: timestamp("locked_at", { withTimezone: true }),
  legalHoldUntil: timestamp("legal_hold_until", { withTimezone: true }),
  allowCardPayment: boolean("allow_card_payment").notNull().default(true),
  maxCardAmountOverride: numeric("max_card_amount_override", { precision: 12, scale: 2 }),
  portalTokenHash: varchar("portal_token_hash", { length: 128 }),
  portalTokenEnc: text("portal_token_enc"),
  chasingEnabled: boolean("chasing_enabled").notNull().default(true),
  chasingScheduleDaysJson: jsonb("chasing_schedule_days_json").$type<number[]>().notNull().default([-3, 3, 14]),
  lastChasedStage: integer("last_chased_stage"),
  disputedReason: text("disputed_reason"),
  pdfFileNoteId: uuid("pdf_file_note_id").references(() => fileNotes.id),
  notes: text("notes"),
  ...tenantAndTimestamps,
});
