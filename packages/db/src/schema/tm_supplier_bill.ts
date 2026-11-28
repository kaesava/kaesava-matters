import { pgTable, uuid, varchar, date, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobs } from "./tm_job.js";
import { fileNotes } from "./file_note.js";

/**
 * Supplier bill / receipt captured via OCR, inbound email, or manual entry.
 */
export const tmSupplierBills = pgTable("tm_supplier_bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobId: uuid("job_id").references(() => tmJobs.id),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  supplierAbn: varchar("supplier_abn", { length: 32 }),
  billNumber: varchar("bill_number", { length: 80 }),
  issueDate: date("issue_date").notNull(),
  dueDate: date("due_date"),
  subtotalExTax: numeric("subtotal_ex_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull().default("0.00"),
  receiptFileNoteId: uuid("receipt_file_note_id").references(() => fileNotes.id),
  source: varchar("source", { length: 24 }).notNull().default("MANUAL"),
  status: varchar("status", { length: 24 }).notNull().default("DRAFT"),
  appliedMarkupPct: numeric("applied_markup_pct", { precision: 6, scale: 2 }).notNull().default("0.00"),
  ...tenantAndTimestamps,
});
