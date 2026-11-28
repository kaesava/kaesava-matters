import { and, eq, isNull } from "drizzle-orm";
import { sendEmail } from "@kaesava/core";
import { resolveAppConfigOrDefault } from "@kaesava/config";
import { generatePortalToken } from "@kaesava/core";
import {
  tmBusinessProfiles,
  tmCommLogs,
  tmCustomers,
  tmQuoteLines,
  tmQuoteOptionGroups,
  tmQuotes,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import { calculateQuoteTotals } from "./calculateQuoteTotals.js";
import { renderQuotePdf } from "./renderQuotePdf.js";
import type { CreateQuoteInputType, UpdateQuoteInputType } from "./schemas.js";

export interface QuoteCommandContext {
  tenantId: string;
  appId: string;
  userId: string;
}

async function allocateQuoteNumber(db: DbOrTx, ctx: QuoteCommandContext): Promise<string> {
  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
    .limit(1);
  const prefix = profile?.quotePrefix ?? "Q-";
  const seq = profile?.nextQuoteNumber ?? 1;
  if (profile) {
    await db
      .update(tmBusinessProfiles)
      .set({ nextQuoteNumber: seq + 1, updatedAt: new Date(), updatedBy: ctx.userId })
      .where(eq(tmBusinessProfiles.id, profile.id));
  }
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

async function insertOptionGroupsAndLines(
  db: DbOrTx,
  ctx: QuoteCommandContext,
  quoteId: string,
  input: CreateQuoteInputType,
  calc: ReturnType<typeof calculateQuoteTotals>
): Promise<string | null> {
  const now = new Date();
  const groupIdByKey = new Map<string, string>();
  let selectedGroupId: string | null = null;

  for (let i = 0; i < input.optionGroups.length; i++) {
    const g = input.optionGroups[i];
    const totals = calc.optionGroups[i] ?? { subtotalExTax: 0, totalTax: 0, totalIncTax: 0 };
    const id = crypto.randomUUID();
    groupIdByKey.set(g.key, id);
    if (g.isSelected || (!selectedGroupId && g.isRecommended)) selectedGroupId = id;
    await db.insert(tmQuoteOptionGroups).values({
      id,
      quoteId,
      name: g.name,
      description: g.description ?? null,
      isRecommended: g.isRecommended,
      isSelected: g.isSelected,
      sortOrder: g.sortOrder,
      subtotalExTax: totals.subtotalExTax.toFixed(2),
      totalTax: totals.totalTax.toFixed(2),
      totalIncTax: totals.totalIncTax.toFixed(2),
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    });
  }

  if (input.lines.length > 0) {
    await db.insert(tmQuoteLines).values(
      input.lines.map((l, idx) => {
        const c = calc.lines[idx];
        return {
          id: crypto.randomUUID(),
          quoteId,
          optionGroupId: l.optionGroupKey ? (groupIdByKey.get(l.optionGroupKey) ?? null) : null,
          pricebookItemId: l.pricebookItemId ?? null,
          description: l.description,
          quantity: l.quantity.toFixed(2),
          unitCostExTax: l.unitCostExTax.toFixed(2),
          unitSellPrice: l.unitSellPrice.toFixed(2),
          taxCode: l.taxCode,
          lineTotalExTax: c.lineTotalExTax.toFixed(2),
          lineTax: c.lineTax.toFixed(2),
          lineTotalIncTax: c.lineTotalIncTax.toFixed(2),
          sortOrder: l.sortOrder,
          tenantId: ctx.tenantId,
          appId: ctx.appId,
          createdAt: now,
          createdBy: ctx.userId,
          updatedAt: now,
          updatedBy: ctx.userId,
        };
      })
    );
  }
  return selectedGroupId;
}

export async function createQuoteCommand(
  db: DbOrTx,
  ctx: QuoteCommandContext,
  input: CreateQuoteInputType
) {
  const quoteNumber = await allocateQuoteNumber(db, ctx);
  const calc = calculateQuoteTotals(input);
  const now = new Date();
  const quoteId = crypto.randomUUID();

  const [created] = await db
    .insert(tmQuotes)
    .values({
      id: quoteId,
      quoteNumber,
      title: input.title,
      description: input.description ?? null,
      status: "DRAFT",
      customerId: input.customerId,
      siteId: input.siteId ?? null,
      jobId: input.jobId ?? null,
      version: 1,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      gstMode: input.gstMode,
      subtotalExTax: calc.subtotalExTax.toFixed(2),
      totalTax: calc.totalTax.toFixed(2),
      totalIncTax: calc.totalIncTax.toFixed(2),
      depositType: input.depositType,
      depositValue: input.depositValue.toFixed(2),
      depositAmountDue: calc.depositAmountDue.toFixed(2),
      notes: input.notes ?? null,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  const selectedOptionGroupId = await insertOptionGroupsAndLines(db, ctx, quoteId, input, calc);
  if (selectedOptionGroupId) {
    await db.update(tmQuotes).set({ selectedOptionGroupId }).where(eq(tmQuotes.id, quoteId));
  }
  return { ...created, selectedOptionGroupId };
}

export async function updateQuoteCommand(
  db: DbOrTx,
  ctx: QuoteCommandContext,
  input: UpdateQuoteInputType
) {
  const [existing] = await db
    .select()
    .from(tmQuotes)
    .where(and(eq(tmQuotes.id, input.id), eq(tmQuotes.tenantId, ctx.tenantId), isNull(tmQuotes.archivedAt)))
    .limit(1);
  if (!existing) throw new Error("Quote not found.");
  if (existing.status === "ACCEPTED") throw new Error("Accepted quotes cannot be modified.");

  const calc = calculateQuoteTotals(input);
  const now = new Date();
  await db
    .update(tmQuoteLines)
    .set({ archivedAt: now, archivedBy: ctx.userId })
    .where(and(eq(tmQuoteLines.quoteId, input.id), isNull(tmQuoteLines.archivedAt)));
  await db
    .update(tmQuoteOptionGroups)
    .set({ archivedAt: now, archivedBy: ctx.userId })
    .where(and(eq(tmQuoteOptionGroups.quoteId, input.id), isNull(tmQuoteOptionGroups.archivedAt)));

  const selectedOptionGroupId = await insertOptionGroupsAndLines(db, ctx, input.id, input, calc);
  const [updated] = await db
    .update(tmQuotes)
    .set({
      title: input.title,
      description: input.description ?? null,
      customerId: input.customerId,
      siteId: input.siteId ?? null,
      jobId: input.jobId ?? null,
      version: input.version ?? existing.version + 1,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      gstMode: input.gstMode,
      subtotalExTax: calc.subtotalExTax.toFixed(2),
      totalTax: calc.totalTax.toFixed(2),
      totalIncTax: calc.totalIncTax.toFixed(2),
      depositType: input.depositType,
      depositValue: input.depositValue.toFixed(2),
      depositAmountDue: calc.depositAmountDue.toFixed(2),
      selectedOptionGroupId,
      notes: input.notes ?? null,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmQuotes.id, input.id))
    .returning();
  return updated;
}

export async function sendQuoteCommand(
  db: DbOrTx,
  ctx: QuoteCommandContext,
  quoteId: string,
  recipientEmail?: string
) {
  const [quote] = await db
    .select()
    .from(tmQuotes)
    .where(and(eq(tmQuotes.id, quoteId), eq(tmQuotes.tenantId, ctx.tenantId), isNull(tmQuotes.archivedAt)))
    .limit(1);
  if (!quote) throw new Error("Quote not found.");

  const [customer] = await db
    .select()
    .from(tmCustomers)
    .where(eq(tmCustomers.id, quote.customerId))
    .limit(1);
  const [profile] = await db
    .select({ abn: tmBusinessProfiles.abn })
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, ctx.tenantId), eq(tmBusinessProfiles.appId, ctx.appId)))
    .limit(1);
  const lines = await db
    .select()
    .from(tmQuoteLines)
    .where(and(eq(tmQuoteLines.quoteId, quoteId), isNull(tmQuoteLines.archivedAt)));

  await renderQuotePdf(db, {
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    userId: ctx.userId,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    title: quote.title,
    customerName: customer?.name ?? "Customer",
    abn: profile?.abn ?? null,
    gstMode: quote.gstMode,
    subtotalExTax: quote.subtotalExTax,
    totalTax: quote.totalTax,
    totalIncTax: quote.totalIncTax,
    depositAmountDue: quote.depositAmountDue,
    lines,
  });

  const { rawToken, tokenHash } = await generatePortalToken();
  const now = new Date();
  const [updated] = await db
    .update(tmQuotes)
    .set({
      status: quote.status === "DRAFT" ? "SENT" : quote.status,
      portalTokenHash: tokenHash,
      portalTokenEnc: rawToken,
      sentAt: quote.sentAt ?? now,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .where(eq(tmQuotes.id, quoteId))
    .returning();

  const targetEmail = recipientEmail ?? customer?.email ?? null;
  const appConfig = resolveAppConfigOrDefault(ctx.appId);
  const portalUrl = `${appConfig.branding.appUrl}/q/${rawToken}`;
  const subject = `Quote ${quote.quoteNumber}: ${quote.title}`;
  let commStatus: "SENT" | "FAILED" | "QUEUED" = "QUEUED";

  if (targetEmail) {
    try {
      const result = await sendEmail({
        to: targetEmail,
        subject,
        html: `<p>Hi ${customer?.name ?? "there"},</p><p>Your quote <strong>${quote.quoteNumber}</strong> (${quote.title}) for <strong>$${quote.totalIncTax}</strong> is ready.</p><p><a href="${portalUrl}">View &amp; Accept Quote</a></p>`,
        text: `Hi ${customer?.name ?? "there"},\n\nYour quote ${quote.quoteNumber} (${quote.title}) for $${quote.totalIncTax} is ready.\n\nView & accept here: ${portalUrl}`,
        appId: ctx.appId,
      });
      commStatus = result.success ? "SENT" : "FAILED";
    } catch {
      commStatus = "FAILED";
    }
  }

  await db.insert(tmCommLogs).values({
    id: crypto.randomUUID(),
    entityType: "QUOTE",
    entityId: quoteId,
    channel: "EMAIL",
    direction: "OUTBOUND",
    recipient: targetEmail,
    subject,
    bodyPreview: `Quote sent (${quote.totalIncTax})`,
    status: commStatus,
    sentAt: commStatus === "SENT" ? now : undefined,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    createdAt: now,
    createdBy: ctx.userId,
    updatedAt: now,
    updatedBy: ctx.userId,
  });

  return { quote: updated, rawToken };
}

export async function archiveQuoteCommand(
  db: DbOrTx,
  ctx: QuoteCommandContext,
  quoteId: string
) {
  const now = new Date();
  const [archived] = await db
    .update(tmQuotes)
    .set({ archivedAt: now, archivedBy: ctx.userId, updatedAt: now, updatedBy: ctx.userId })
    .where(and(eq(tmQuotes.id, quoteId), eq(tmQuotes.tenantId, ctx.tenantId), isNull(tmQuotes.archivedAt)))
    .returning();
  if (!archived) throw new Error("Quote not found.");
  return archived;
}
