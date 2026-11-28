import { pgTable, uuid, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmInvoices } from "./tm_invoice.js";
import { tmCustomers } from "./tm_customer.js";

/**
 * Credit note issued against an invoice (reduces invoice balance or adds customer credit).
 */
export const tmCreditNotes = pgTable("tm_credit_notes", {
  id: uuid("id").defaultRandom().primaryKey(),
  creditNoteNumber: varchar("credit_note_number", { length: 40 }).notNull(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => tmInvoices.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  reason: text("reason").notNull(),
  amountExTax: numeric("amount_ex_tax", { precision: 12, scale: 2 }).notNull(),
  taxAmount: numeric("tax_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  totalIncTax: numeric("total_inc_tax", { precision: 12, scale: 2 }).notNull(),
  creditDestination: varchar("credit_destination", { length: 32 }).notNull().default("INVOICE_BALANCE"),
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
