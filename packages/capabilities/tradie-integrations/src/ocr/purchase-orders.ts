import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tmPurchaseOrders, tmSupplierBills, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";

export const PurchaseOrderLineSchema = z
  .object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitCostExTax: z.number().nonnegative(),
  })
  .strict();

export const CreatePurchaseOrderInput = z
  .object({
    poNumber: z.string().min(1).max(40),
    jobId: z.string().uuid().nullable().optional(),
    supplierName: z.string().min(1).max(255),
    supplierEmail: z.string().email().nullable().optional(),
    lines: z.array(PurchaseOrderLineSchema).min(1),
    notes: z.string().nullable().optional(),
  })
  .strict();

export const CreateSupplierBillInput = z
  .object({
    jobId: z.string().uuid().nullable().optional(),
    supplierName: z.string().min(1).max(255),
    supplierAbn: z.string().max(32).nullable().optional(),
    billNumber: z.string().max(80).nullable().optional(),
    issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    subtotalExTax: z.number().nonnegative(),
    taxAmount: z.number().nonnegative(),
    totalIncTax: z.number().nonnegative(),
    receiptFileNoteId: z.string().uuid().nullable().optional(),
    source: z.enum(["OCR", "EMAIL", "MANUAL"]).optional(),
    appliedMarkupPct: z.number().nonnegative().optional(),
  })
  .strict();

export async function listPurchaseOrdersQuery(db: DbOrTx, ctx: IntegrationsContext) {
  return db
    .select()
    .from(tmPurchaseOrders)
    .where(and(eq(tmPurchaseOrders.tenantId, ctx.tenantId), eq(tmPurchaseOrders.appId, ctx.appId), isNull(tmPurchaseOrders.archivedAt)))
    .orderBy(desc(tmPurchaseOrders.createdAt));
}

export async function listSupplierBillsQuery(db: DbOrTx, ctx: IntegrationsContext) {
  return db
    .select()
    .from(tmSupplierBills)
    .where(and(eq(tmSupplierBills.tenantId, ctx.tenantId), eq(tmSupplierBills.appId, ctx.appId), isNull(tmSupplierBills.archivedAt)))
    .orderBy(desc(tmSupplierBills.createdAt));
}

export async function createSupplierBillCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof CreateSupplierBillInput>
) {
  const now = new Date();
  const [bill] = await db
    .insert(tmSupplierBills)
    .values({
      id: crypto.randomUUID(),
      jobId: input.jobId ?? null,
      supplierName: input.supplierName,
      supplierAbn: input.supplierAbn ?? null,
      billNumber: input.billNumber ?? null,
      issueDate: input.issueDate,
      dueDate: input.dueDate ?? null,
      subtotalExTax: input.subtotalExTax.toFixed(2),
      taxAmount: input.taxAmount.toFixed(2),
      totalIncTax: input.totalIncTax.toFixed(2),
      receiptFileNoteId: input.receiptFileNoteId ?? null,
      source: input.source ?? "MANUAL",
      status: "DRAFT",
      appliedMarkupPct: (input.appliedMarkupPct ?? 0).toFixed(2),
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return bill;
}

export async function createPurchaseOrderCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof CreatePurchaseOrderInput>
) {
  const now = new Date();
  const [po] = await db
    .insert(tmPurchaseOrders)
    .values({
      id: crypto.randomUUID(),
      poNumber: input.poNumber,
      jobId: input.jobId ?? null,
      supplierName: input.supplierName,
      supplierEmail: input.supplierEmail ?? null,
      status: "DRAFT",
      linesJson: input.lines,
      notes: input.notes ?? null,
      sentAt: null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return po;
}

export async function sendPurchaseOrderCommand(db: DbOrTx, ctx: IntegrationsContext, poId: string) {
  const now = new Date();
  const [po] = await db
    .update(tmPurchaseOrders)
    .set({ status: "SENT", sentAt: now, updatedAt: now, updatedBy: ctx.userId })
    .where(and(eq(tmPurchaseOrders.id, poId), eq(tmPurchaseOrders.tenantId, ctx.tenantId), eq(tmPurchaseOrders.appId, ctx.appId)))
    .returning();
  if (!po) throw new Error("Purchase order not found.");
  return po;
}

export async function convertPurchaseOrderToBillCommand(db: DbOrTx, ctx: IntegrationsContext, poId: string) {
  const [po] = await db
    .select()
    .from(tmPurchaseOrders)
    .where(and(eq(tmPurchaseOrders.id, poId), eq(tmPurchaseOrders.tenantId, ctx.tenantId), eq(tmPurchaseOrders.appId, ctx.appId)))
    .limit(1);
  if (!po) throw new Error("Purchase order not found.");

  const subtotalExTax = po.linesJson.reduce((acc, line) => acc + line.quantity * line.unitCostExTax, 0);
  const taxAmount = Number((subtotalExTax * 0.1).toFixed(2));
  const totalIncTax = Number((subtotalExTax + taxAmount).toFixed(2));
  const now = new Date();

  const [bill] = await db
    .insert(tmSupplierBills)
    .values({
      id: crypto.randomUUID(),
      jobId: po.jobId,
      supplierName: po.supplierName,
      supplierAbn: null,
      billNumber: po.poNumber,
      issueDate: now.toISOString().slice(0, 10),
      dueDate: null,
      subtotalExTax: subtotalExTax.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalIncTax: totalIncTax.toFixed(2),
      receiptFileNoteId: null,
      source: "MANUAL",
      status: "DRAFT",
      appliedMarkupPct: "0.00",
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  await db
    .update(tmPurchaseOrders)
    .set({ status: "BILLED", updatedAt: now, updatedBy: ctx.userId })
    .where(eq(tmPurchaseOrders.id, po.id));

  return bill;
}
