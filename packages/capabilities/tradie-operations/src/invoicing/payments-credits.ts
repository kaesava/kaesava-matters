import Stripe from "stripe";
import { and, eq, isNull } from "drizzle-orm";
import {
  tmBusinessProfiles,
  tmCreditNotes,
  tmCustomers,
  tmInvoicePayments,
  tmInvoiceRefunds,
  tmInvoices,
  tmJobs,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { InvoiceCommandContext } from "./commands.js";

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function resolveInvoiceStatus(balanceDue: number, amountPaid: number, currentStatus: string): string {
  if (balanceDue <= 0) return "PAID";
  if (amountPaid > 0) return "PARTIALLY_PAID";
  return currentStatus === "PAID" ? "SENT" : currentStatus;
}

export async function recordInvoicePaymentCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: {
    invoiceId: string;
    amount: number;
    paymentMethod: "STRIPE_CARD" | "STRIPE_BECS" | "STRIPE_PAYTO" | "BANK_TRANSFER" | "CASH" | "CUSTOMER_CREDIT";
    reference?: string | null;
    stripePaymentIntentId?: string | null;
    stripeChargeId?: string | null;
    notes?: string | null;
  }
) {
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, input.invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice not found.");

  const now = new Date();
  const [payment] = await db
    .insert(tmInvoicePayments)
    .values({
      id: crypto.randomUUID(),
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      amount: input.amount.toFixed(2),
      paymentMethod: input.paymentMethod,
      paymentDate: now,
      reference: input.reference ?? null,
      stripePaymentIntentId: input.stripePaymentIntentId ?? null,
      stripeChargeId: input.stripeChargeId ?? null,
      notes: input.notes ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  const newAmountPaid = round2(Number(invoice.amountPaid) + input.amount);
  const newBalanceDue = Math.max(0, round2(Number(invoice.balanceDue) - input.amount));
  const nextStatus = resolveInvoiceStatus(newBalanceDue, newAmountPaid, invoice.status);

  await db
    .update(tmInvoices)
    .set({
      amountPaid: newAmountPaid.toFixed(2),
      balanceDue: newBalanceDue.toFixed(2),
      status: nextStatus,
      lockedAt: invoice.lockedAt ?? now,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmInvoices.id, invoice.id));

  if (newBalanceDue === 0 && invoice.invoiceType === "FINAL" && invoice.jobId) {
    await db
      .update(tmJobs)
      .set({
        status: "PAID",
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(and(eq(tmJobs.id, invoice.jobId), eq(tmJobs.tenantId, ctx.tenantId)));
  }

  return payment;
}

export async function issueCreditNoteCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: {
    invoiceId: string;
    reason: string;
    amountExTax: number;
    includeGst: boolean;
    creditDestination: "INVOICE_BALANCE" | "CUSTOMER_CREDIT";
  }
) {
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, input.invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice not found.");

  const taxAmount = input.includeGst && invoice.gstRegisteredSnapshot ? round2(input.amountExTax * 0.1) : 0;
  const totalIncTax = round2(input.amountExTax + taxAmount);
  const now = new Date();
  const creditNoteNumber = `CN-${invoice.invoiceNumber}-${String(now.getTime()).slice(-4)}`;

  const [creditNote] = await db
    .insert(tmCreditNotes)
    .values({
      id: crypto.randomUUID(),
      creditNoteNumber,
      invoiceId: invoice.id,
      customerId: invoice.customerId,
      reason: input.reason,
      amountExTax: input.amountExTax.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalIncTax: totalIncTax.toFixed(2),
      creditDestination: input.creditDestination,
      issuedAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  if (input.creditDestination === "INVOICE_BALANCE") {
    const applied = Math.min(Number(invoice.balanceDue), totalIncTax);
    const newCreditApplied = round2(Number(invoice.creditApplied) + applied);
    const newBalanceDue = Math.max(0, round2(Number(invoice.balanceDue) - applied));
    await db
      .update(tmInvoices)
      .set({
        creditApplied: newCreditApplied.toFixed(2),
        balanceDue: newBalanceDue.toFixed(2),
        status: newBalanceDue <= 0 ? "PAID" : invoice.status,
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(eq(tmInvoices.id, invoice.id));
  } else {
    const [customer] = await db
      .select({ creditBalance: tmCustomers.creditBalance })
      .from(tmCustomers)
      .where(eq(tmCustomers.id, invoice.customerId))
      .limit(1);
    const nextCredit = round2(Number(customer?.creditBalance ?? 0) + totalIncTax);
    await db
      .update(tmCustomers)
      .set({ creditBalance: nextCredit.toFixed(2), updatedAt: now, updatedBy: ctx.userId })
      .where(eq(tmCustomers.id, invoice.customerId));
  }

  return creditNote;
}

export async function applyCustomerCreditCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: { invoiceId: string; amount: number }
) {
  const [invoice] = await db
    .select()
    .from(tmInvoices)
    .where(and(eq(tmInvoices.id, input.invoiceId), eq(tmInvoices.tenantId, ctx.tenantId), isNull(tmInvoices.archivedAt)))
    .limit(1);
  if (!invoice) throw new Error("Invoice not found.");

  const [customer] = await db
    .select()
    .from(tmCustomers)
    .where(eq(tmCustomers.id, invoice.customerId))
    .limit(1);
  const available = Number(customer?.creditBalance ?? 0);
  if (input.amount > available) {
    throw new Error("Insufficient customer credit balance.");
  }

  const now = new Date();
  await db
    .update(tmCustomers)
    .set({ creditBalance: round2(available - input.amount).toFixed(2), updatedAt: now, updatedBy: ctx.userId })
    .where(eq(tmCustomers.id, invoice.customerId));

  return recordInvoicePaymentCommand(db, ctx, {
    invoiceId: invoice.id,
    amount: input.amount,
    paymentMethod: "CUSTOMER_CREDIT",
    notes: "Applied from customer credit balance",
  });
}

export async function refundInvoicePaymentCommand(
  db: DbOrTx,
  ctx: InvoiceCommandContext,
  input: {
    paymentId: string;
    amount: number;
    refundMethod: "STRIPE" | "MANUAL";
    reason?: string | null;
    stripeSecretKey?: string;
  }
) {
  const [payment] = await db
    .select()
    .from(tmInvoicePayments)
    .where(and(eq(tmInvoicePayments.id, input.paymentId), eq(tmInvoicePayments.tenantId, ctx.tenantId)))
    .limit(1);
  if (!payment) throw new Error("Payment not found.");

  const refundable = round2(Number(payment.amount) - Number(payment.refundedAmount));
  if (input.amount > refundable) {
    throw new Error("Refund amount exceeds remaining refundable payment balance.");
  }

  let stripeRefundId: string | null = null;
  if (input.refundMethod === "STRIPE" && payment.stripePaymentIntentId && input.stripeSecretKey) {
    const [profile] = await db
      .select({ stripeAccountId: tmBusinessProfiles.stripeAccountId })
      .from(tmBusinessProfiles)
      .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
      .limit(1);
    const stripe = new Stripe(input.stripeSecretKey);
    const refund = await stripe.refunds.create(
      {
        payment_intent: payment.stripePaymentIntentId,
        amount: Math.round(input.amount * 100),
      },
      profile?.stripeAccountId ? { stripeAccount: profile.stripeAccountId } : undefined
    );
    stripeRefundId = refund.id;
  }

  const now = new Date();
  const [refundRow] = await db
    .insert(tmInvoiceRefunds)
    .values({
      id: crypto.randomUUID(),
      invoiceId: payment.invoiceId,
      paymentId: payment.id,
      amount: input.amount.toFixed(2),
      refundMethod: input.refundMethod,
      reason: input.reason ?? null,
      stripeRefundId,
      refundedAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  await db
    .update(tmInvoicePayments)
    .set({
      refundedAmount: round2(Number(payment.refundedAmount) + input.amount).toFixed(2),
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmInvoicePayments.id, payment.id));

  const [invoice] = await db.select().from(tmInvoices).where(eq(tmInvoices.id, payment.invoiceId)).limit(1);
  if (invoice) {
    const newPaid = Math.max(0, round2(Number(invoice.amountPaid) - input.amount));
    const newBalance = round2(Number(invoice.balanceDue) + input.amount);
    await db
      .update(tmInvoices)
      .set({
        amountPaid: newPaid.toFixed(2),
        balanceDue: newBalance.toFixed(2),
        status: resolveInvoiceStatus(newBalance, newPaid, invoice.status),
        updatedAt: now,
        updatedBy: ctx.userId,
      })
      .where(eq(tmInvoices.id, invoice.id));
  }

  return refundRow;
}
