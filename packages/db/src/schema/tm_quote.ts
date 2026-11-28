import { pgTable, uuid, varchar, text, integer, numeric, timestamp, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmCustomers } from "./tm_customer.js";
import { tmSites } from "./tm_site.js";
import { tmJobs } from "./tm_job.js";
import { fileNotes } from "./file_note.js";

/**
 * Tradie Matters customer quote with Good/Better/Best options, deposit, and e-signature portal fields.
 */
export const tmQuotes = pgTable("tm_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  quoteNumber: varchar("quote_number", { length: 40 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 32 }).notNull().default("DRAFT"),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  siteId: uuid("site_id").references(() => tmSites.id),
  jobId: uuid("job_id").references(() => tmJobs.id),
  version: integer("version").notNull().default(1),
  validUntil: timestamp("valid_until", { withTimezone: true }),
  gstMode: varchar("gst_mode", { length: 24 }).notNull().default("EXCLUSIVE"),
  subtotalExTax: numeric("subtotal_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalTax: numeric("total_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  depositType: varchar("deposit_type", { length: 24 }).notNull().default("NONE"),
  depositValue: numeric("deposit_value", { precision: 12, scale: 2 }).notNull().default("0.00"),
  depositAmountDue: numeric("deposit_amount_due", { precision: 12, scale: 2 }).notNull().default("0.00"),
  portalTokenHash: varchar("portal_token_hash", { length: 128 }),
  portalTokenEnc: text("portal_token_enc"),
  followUpEnabled: boolean("follow_up_enabled").notNull().default(true),
  followUpStage: integer("follow_up_stage").notNull().default(0),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  viewedAt: timestamp("viewed_at", { withTimezone: true }),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  declinedAt: timestamp("declined_at", { withTimezone: true }),
  declineReason: text("decline_reason"),
  signerName: varchar("signer_name", { length: 255 }),
  signatureSvg: text("signature_svg"),
  selectedOptionGroupId: uuid("selected_option_group_id"),
  pdfFileNoteId: uuid("pdf_file_note_id").references(() => fileNotes.id),
  followUpSentAt: timestamp("follow_up_sent_at", { withTimezone: true }),
  notes: text("notes"),
  ...tenantAndTimestamps,
});
