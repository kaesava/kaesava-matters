import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { tmCustomers, tmPhoneNumbers, tmReviewRequests, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";

export interface ReviewBoosterEnv {
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  TWILIO_ACCOUNT_SID?: string;
  TWILIO_AUTH_TOKEN?: string;
  APP_PUBLIC_URL?: string;
  smsCommsEnabled?: boolean;
  fetcher?: typeof fetch;
}

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
  input: z.infer<typeof SendReviewBoosterInput>,
  env: ReviewBoosterEnv = {}
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

  if (req && (env.RESEND_API_KEY || (env.smsCommsEnabled && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN))) {
    const [customer] = await db
      .select({ name: tmCustomers.name, email: tmCustomers.email, phone: tmCustomers.phone })
      .from(tmCustomers)
      .where(and(eq(tmCustomers.id, input.customerId), eq(tmCustomers.tenantId, ctx.tenantId), isNull(tmCustomers.archivedAt)))
      .limit(1);

    const baseUrl = (env.APP_PUBLIC_URL ?? "https://tradiematters.kaesava.au").replace(/\/$/, "");
    const reviewLink = `${baseUrl}/review/${req.id}`;
    const fn = env.fetcher ?? fetch;

    if (env.smsCommsEnabled && customer?.phone && env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN) {
      const [phone] = await db
        .select({ e164Number: tmPhoneNumbers.e164Number })
        .from(tmPhoneNumbers)
        .where(and(eq(tmPhoneNumbers.tenantId, ctx.tenantId), eq(tmPhoneNumbers.appId, ctx.appId), isNull(tmPhoneNumbers.archivedAt)))
        .limit(1);
      if (phone) {
        const auth = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`);
        await fn(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            From: phone.e164Number,
            To: customer.phone,
            Body: `Hi ${customer.name ?? "there"}, thanks for choosing us! Please rate your experience: ${reviewLink}`,
          }),
        });
      }
    } else if (customer?.email && env.RESEND_API_KEY) {
      await fn("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: env.RESEND_FROM_EMAIL ?? "reviews@tradiematters.kaesava.au",
          to: [customer.email],
          subject: "How did we do? Share your feedback",
          html: `<p>Hi ${customer.name ?? "there"},</p><p>Thanks for your business! Please take 10 seconds to rate your experience:</p><p><a href="${reviewLink}">Rate your experience</a></p>`,
        }),
      });
    }
  }

  return req;
}

export async function getReviewRequestByTokenQuery(db: DbOrTx, reviewRequestId: string) {
  const [existing] = await db
    .select({
      id: tmReviewRequests.id,
      ratingScore: tmReviewRequests.ratingScore,
      googleReviewUrl: tmReviewRequests.googleReviewUrl,
      redirectedToGoogleAt: tmReviewRequests.redirectedToGoogleAt,
    })
    .from(tmReviewRequests)
    .where(and(eq(tmReviewRequests.id, reviewRequestId), isNull(tmReviewRequests.archivedAt)))
    .limit(1);

  if (!existing) throw new Error("Review request not found.");
  return {
    id: existing.id,
    ratingScore: existing.ratingScore,
    alreadySubmitted: existing.ratingScore !== null,
    googleReviewUrl: existing.googleReviewUrl,
  };
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
  const ownerAlerted = input.ratingScore <= 3;
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
    ownerAlerted,
  };
}
