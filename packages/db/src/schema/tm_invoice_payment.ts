import { pgTable, uuid, varchar, text, numeric, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmInvoices } from "./tm_invoice.js";
import { tmCustomers } from "./tm_customer.js";

/**
 * Payment recorded against a Tradie Matters invoice (Stripe Connect Direct Charge, BECS, or manual).
 */
export const tmInvoicePayments = pgTable("tm_invoice_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => tmInvoices.id),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 32 }).notNull().default("BANK_TRANSFER"),
  paymentDate: timestamp("payment_date", { withTimezone: true }).notNull().defaultNow(),
  reference: varchar("reference", { length: 255 }),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  stripeChargeId: varchar("stripe_charge_id", { length: 255 }),
  refundedAmount: numeric("refunded_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
  notes: text("notes"),
  ...tenantAndTimestamps,
});
