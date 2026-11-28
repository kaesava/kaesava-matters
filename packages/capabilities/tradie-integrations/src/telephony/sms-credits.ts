import { and, eq, isNull, sql } from "drizzle-orm";
import { tmSmsCreditEntries, type DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { IntegrationsContext } from "../accounting/sync-service.js";

export type SmsCreditPackKey = "PACK_100" | "PACK_500";

export const SMS_CREDIT_PACKS: Record<SmsCreditPackKey, { credits: number; priceAudCents: number }> = {
  PACK_100: { credits: 100, priceAudCents: 1000 },
  PACK_500: { credits: 500, priceAudCents: 4500 },
};

export async function getSmsCreditBalanceQuery(db: DbOrTx, ctx: Pick<IntegrationsContext, "tenantId" | "appId">): Promise<number> {
  const [row] = await db
    .select({ balance: sql<number>`coalesce(sum(${tmSmsCreditEntries.creditsDelta}), 0)::int` })
    .from(tmSmsCreditEntries)
    .where(
      and(
        eq(tmSmsCreditEntries.tenantId, ctx.tenantId),
        eq(tmSmsCreditEntries.appId, ctx.appId),
        isNull(tmSmsCreditEntries.archivedAt)
      )
    );
  return row?.balance ?? 0;
}

export async function deductSmsCreditsCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: { cost: number; reason: "OUTBOUND_SMS" | "OUTBOUND_MMS" | "MISSED_CALL_AUTO"; commLogId?: string }
) {
  if (input.cost <= 0) throw new Error("Credit deduction cost must be positive.");
  const balance = await getSmsCreditBalanceQuery(db, ctx);
  if (balance < input.cost) {
    throw new Error("Insufficient SMS credits. Purchase a credit pack to continue.");
  }

  const now = new Date();
  const [entry] = await db
    .insert(tmSmsCreditEntries)
    .values({
      id: crypto.randomUUID(),
      creditsDelta: -input.cost,
      reason: input.reason,
      stripeCheckoutSessionId: null,
      commLogId: input.commLogId ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return { entry, remainingBalance: balance - input.cost };
}

export async function grantSmsCreditPackCommand(
  db: DbOrTx,
  ctx: IntegrationsContext,
  input: { packKey: SmsCreditPackKey; stripeCheckoutSessionId: string }
) {
  const existing = await db
    .select()
    .from(tmSmsCreditEntries)
    .where(
      and(
        eq(tmSmsCreditEntries.tenantId, ctx.tenantId),
        eq(tmSmsCreditEntries.appId, ctx.appId),
        eq(tmSmsCreditEntries.stripeCheckoutSessionId, input.stripeCheckoutSessionId),
        isNull(tmSmsCreditEntries.archivedAt)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const pack = SMS_CREDIT_PACKS[input.packKey];
  const now = new Date();
  const [entry] = await db
    .insert(tmSmsCreditEntries)
    .values({
      id: crypto.randomUUID(),
      creditsDelta: pack.credits,
      reason: "PACK_PURCHASE",
      stripeCheckoutSessionId: input.stripeCheckoutSessionId,
      commLogId: null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return entry;
}
