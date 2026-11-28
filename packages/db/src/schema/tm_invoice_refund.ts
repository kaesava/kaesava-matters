import { pgTable, uuid, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmInvoices } from "./tm_invoice.js";
import { tmInvoicePayments } from "./tm_invoice_payment.js";

/**
 * Refund recorded against an invoice payment (Stripe Connect or manual).
 */
export const tmInvoiceRefunds = pgTable("tm_invoice_refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => tmInvoices.id),
  paymentId: uuid("payment_id")
    .notNull()
    .references(() => tmInvoicePayments.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  refundMethod: varchar("refund_method", { length: 32 }).notNull().default("MANUAL"),
  reason: text("reason"),
  stripeRefundId: varchar("stripe_refund_id", { length: 255 }),
  refundedAt: timestamp("refunded_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
