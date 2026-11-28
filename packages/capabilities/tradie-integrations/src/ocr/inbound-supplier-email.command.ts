import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tmJobs, tmSupplierBills, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";

export const InboundSupplierEmailInput = z
  .object({
    fromEmail: z.string().email(),
    supplierName: z.string().min(1).max(255),
    supplierAbn: z.string().max(32).nullable().optional(),
    billNumber: z.string().max(80).nullable().optional(),
    subject: z.string(),
    bodyText: z.string(),
    subtotalExTax: z.number().nonnegative().optional(),
    taxAmount: z.number().nonnegative().optional(),
    totalIncTax: z.number().nonnegative().optional(),
    receiptFileNoteId: z.string().uuid().nullable().optional(),
  })
  .strict();

export function parseJobNumberFromText(text: string): string | null {
  const match = text.match(/\b(JOB-\d+|J-\d+)\b/i);
  return match?.[1]?.toUpperCase() ?? null;
}

export async function processInboundSupplierEmailCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof InboundSupplierEmailInput>
) {
  const jobNumber = parseJobNumberFromText(`${input.subject} ${input.bodyText}`);
  let jobId: string | null = null;
  if (jobNumber) {
    const [job] = await db
      .select({ id: tmJobs.id })
      .from(tmJobs)
      .where(
        and(
          eq(tmJobs.tenantId, ctx.tenantId),
          eq(tmJobs.appId, ctx.appId),
          eq(tmJobs.jobNumber, jobNumber),
          isNull(tmJobs.archivedAt)
        )
      )
      .limit(1);
    jobId = job?.id ?? null;
  }

  const now = new Date();
  const [bill] = await db
    .insert(tmSupplierBills)
    .values({
      id: crypto.randomUUID(),
      jobId,
      supplierName: input.supplierName,
      supplierAbn: input.supplierAbn ?? null,
      billNumber: input.billNumber ?? null,
      issueDate: now.toISOString().slice(0, 10),
      dueDate: null,
      subtotalExTax: (input.subtotalExTax ?? 0).toFixed(2),
      taxAmount: (input.taxAmount ?? 0).toFixed(2),
      totalIncTax: (input.totalIncTax ?? 0).toFixed(2),
      receiptFileNoteId: input.receiptFileNoteId ?? null,
      source: "EMAIL",
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
  return bill;
}
