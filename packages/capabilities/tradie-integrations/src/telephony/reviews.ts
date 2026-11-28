import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tmReviewRequests, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";

export const SendReviewBoosterInput = z
  .object({
    jobId: z.string().uuid().nullable().optional(),
    invoiceId: z.string().uuid().nullable().optional(),
    customerId: z.string().uuid(),
    googleReviewUrl: z.string().url().nullable().optional(),
  })
  .strict();

export const SubmitSatisfactionInput = z
  .object({
    reviewRequestId: z.string().uuid(),
    ratingScore: z.number().int().min(1).max(5),
  })
  .strict();

export async function sendReviewBoosterCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: z.infer<typeof SendReviewBoosterInput>
) {
  const now = new Date();
  const [req] = await db
    .insert(tmReviewRequests)
    .values({
      id: crypto.randomUUID(),
      jobId: input.jobId ?? null,
      invoiceId: input.invoiceId ?? null,
      customerId: input.customerId,
      googleReviewUrl: input.googleReviewUrl ?? null,
      ratingScore: null,
      redirectedToGoogleAt: null,
      sentAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return req;
}

export async function submitCustomerSatisfactionCommand(
  db: DbOrTx,
  input: z.infer<typeof SubmitSatisfactionInput>
) {
  const [existing] = await db
    .select()
    .from(tmReviewRequests)
    .where(and(eq(tmReviewRequests.id, input.reviewRequestId), isNull(tmReviewRequests.archivedAt)))
    .limit(1);

  if (!existing) throw new Error("Review request not found.");

  const now = new Date();
  const shouldRedirect = input.ratingScore >= 4 && Boolean(existing.googleReviewUrl);
  const [updated] = await db
    .update(tmReviewRequests)
    .set({
      ratingScore: input.ratingScore,
      redirectedToGoogleAt: shouldRedirect ? now : null,
      updatedAt: now,
    })
    .where(eq(tmReviewRequests.id, existing.id))
    .returning();

  return {
    reviewRequest: updated,
    redirectUrl: shouldRedirect ? existing.googleReviewUrl : null,
  };
}
