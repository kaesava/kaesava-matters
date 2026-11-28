import { and, eq, isNull } from "drizzle-orm";
import { generatePortalToken, hashPortalToken } from "@kaesava/core";
import { calculateDepositAmount } from "./calculateQuoteTotals.js";
import {
  tenants,
  tmBusinessProfiles,
  tmCommLogs,
  tmInvoiceLines,
  tmInvoices,
  tmJobs,
  tmQuoteLines,
  tmQuoteOptionGroups,
  tmQuotes,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";

async function findQuoteByToken(db: DbOrTx, rawToken: string) {
  const tokenHash = await hashPortalToken(rawToken);
  const [quote] = await db
    .select()
    .from(tmQuotes)
    .where(and(eq(tmQuotes.portalTokenHash, tokenHash), isNull(tmQuotes.archivedAt)))
    .limit(1);
  if (!quote) throw new Error("Quote portal link is invalid or expired.");
  return quote;
}

export async function viewQuoteViaPortalCommand(db: DbOrTx, rawToken: string) {
  const quote = await findQuoteByToken(db, rawToken);
  const now = new Date();
  if (!quote.viewedAt || quote.status === "SENT") {
    await db
      .update(tmQuotes)
      .set({
        viewedAt: quote.viewedAt ?? now,
        status: quote.status === "SENT" ? "VIEWED" : quote.status,
        updatedAt: now,
      })
      .where(eq(tmQuotes.id, quote.id));
  }
  const [optionGroups, lines, profiles, tenantRows] = await Promise.all([
    db
      .select()
      .from(tmQuoteOptionGroups)
      .where(and(eq(tmQuoteOptionGroups.quoteId, quote.id), isNull(tmQuoteOptionGroups.archivedAt)))
      .orderBy(tmQuoteOptionGroups.sortOrder),
    db
      .select()
      .from(tmQuoteLines)
      .where(and(eq(tmQuoteLines.quoteId, quote.id), isNull(tmQuoteLines.archivedAt)))
      .orderBy(tmQuoteLines.sortOrder),
    db
      .select()
      .from(tmBusinessProfiles)
      .where(and(eq(tmBusinessProfiles.tenantId, quote.tenantId), eq(tmBusinessProfiles.appId, quote.appId)))
      .limit(1),
    db
      .select({ name: tenants.name })
      .from(tenants)
      .where(eq(tenants.id, quote.tenantId))
      .limit(1),
  ]);
  const profile = profiles[0];
  return {
    quote,
    optionGroups,
    lines,
    business: {
      name: tenantRows[0]?.name ?? "Tradie Matters",
      logoUrl: (profile as { logoUrl?: string | null } | undefined)?.logoUrl ?? null,
      abn: profile?.abn ?? null,
    },
  };
}

async function createDepositInvoiceForAcceptedQuote(
  db: DbOrTx,
  quote: typeof tmQuotes.$inferSelect,
  depositAmount: number
) {
  const [profile] = await db
    .select()
    .from(tmBusinessProfiles)
    .where(and(eq(tmBusinessProfiles.tenantId, quote.tenantId), eq(tmBusinessProfiles.appId, quote.appId)))
    .limit(1);
  const prefix = profile?.invoicePrefix ?? "INV-";
  const seq = profile?.nextInvoiceNumber ?? 1;
  const invoiceNumber = `${prefix}${String(seq).padStart(4, "0")}`;
  if (profile) {
    await db
      .update(tmBusinessProfiles)
      .set({ nextInvoiceNumber: seq + 1, updatedAt: new Date() })
      .where(eq(tmBusinessProfiles.id, profile.id));
  }

  const gstRegistered = profile?.gstRegistered ?? true;
  const exTax = gstRegistered ? Number((depositAmount / 1.1).toFixed(2)) : depositAmount;
  const tax = gstRegistered ? Number((depositAmount - exTax).toFixed(2)) : 0;
  const { rawToken, tokenHash } = await generatePortalToken();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dueDate = new Date(now.getTime() + (profile?.defaultPaymentTermsDays ?? 7) * 86400000)
    .toISOString()
    .slice(0, 10);

  const invoiceId = crypto.randomUUID();
  const [invoice] = await db
    .insert(tmInvoices)
    .values({
      id: invoiceId,
      invoiceNumber,
      invoiceType: "DEPOSIT",
      status: "SENT",
      customerId: quote.customerId,
      siteId: quote.siteId,
      jobId: quote.jobId,
      quoteId: quote.id,
      issueDate: today,
      dueDate,
      gstRegisteredSnapshot: gstRegistered,
      documentTitle: gstRegistered ? "Tax Invoice" : "Invoice",
      subtotalExTax: exTax.toFixed(2),
      totalTax: tax.toFixed(2),
      totalIncTax: depositAmount.toFixed(2),
      balanceDue: depositAmount.toFixed(2),
      lockedAt: now,
      portalTokenHash: tokenHash,
      tenantId: quote.tenantId,
      appId: quote.appId,
      createdAt: now,
      createdBy: quote.createdBy,
      updatedAt: now,
      updatedBy: quote.createdBy,
    })
    .returning();

  await db.insert(tmInvoiceLines).values({
    id: crypto.randomUUID(),
    invoiceId,
    sourceType: "QUOTE",
    sourceId: quote.id,
    description: `Deposit for Quote ${quote.quoteNumber}: ${quote.title}`,
    quantity: "1.00",
    unitCostExTax: "0.00",
    unitSellPrice: exTax.toFixed(2),
    taxCode: gstRegistered ? "GST" : "GST_FREE",
    lineTotalExTax: exTax.toFixed(2),
    lineTax: tax.toFixed(2),
    lineTotalIncTax: depositAmount.toFixed(2),
    sortOrder: 0,
    tenantId: quote.tenantId,
    appId: quote.appId,
    createdAt: now,
    createdBy: quote.createdBy,
    updatedAt: now,
    updatedBy: quote.createdBy,
  });

  return { depositInvoice: invoice, depositPortalToken: rawToken };
}

export async function acceptQuoteViaPortalCommand(
  db: DbOrTx,
  input: {
    rawToken: string;
    signerName: string;
    signatureSvg: string;
    selectedOptionGroupId?: string | null;
  }
) {
  const quote = await findQuoteByToken(db, input.rawToken);
  if (quote.status === "ACCEPTED") throw new Error("Quote has already been accepted.");
  if (quote.status === "DECLINED") throw new Error("Declined quotes cannot be accepted.");

  const now = new Date();
  if (quote.validUntil && new Date(quote.validUntil) < new Date(now.toISOString().slice(0, 10))) {
    throw new Error("Quote has expired.");
  }
  let selectedGroupId = input.selectedOptionGroupId ?? quote.selectedOptionGroupId;
  let subtotalExTax = quote.subtotalExTax;
  let totalTax = quote.totalTax;
  let totalIncTax = quote.totalIncTax;

  if (selectedGroupId) {
    const [group] = await db
      .select()
      .from(tmQuoteOptionGroups)
      .where(and(eq(tmQuoteOptionGroups.id, selectedGroupId), eq(tmQuoteOptionGroups.quoteId, quote.id)))
      .limit(1);
    if (group) {
      subtotalExTax = group.subtotalExTax;
      totalTax = group.totalTax;
      totalIncTax = group.totalIncTax;
      await db
        .update(tmQuoteOptionGroups)
        .set({ isSelected: false, updatedAt: now })
        .where(eq(tmQuoteOptionGroups.quoteId, quote.id));
      await db
        .update(tmQuoteOptionGroups)
        .set({ isSelected: true, updatedAt: now })
        .where(eq(tmQuoteOptionGroups.id, group.id));
    }
  }

  const depositAmt =
    Number(quote.depositValue ?? 0) > 0
      ? calculateDepositAmount(
          Number(totalIncTax),
          quote.depositType as "NONE" | "PERCENT" | "FIXED",
          Number(quote.depositValue)
        )
      : Number(quote.depositAmountDue ?? 0);

  const [updatedQuote] = await db
    .update(tmQuotes)
    .set({
      status: "ACCEPTED",
      acceptedAt: now,
      signerName: input.signerName,
      signatureSvg: input.signatureSvg,
      selectedOptionGroupId: selectedGroupId,
      subtotalExTax,
      totalTax,
      totalIncTax,
      depositAmountDue: depositAmt.toFixed(2),
      updatedAt: now,
    })
    .where(eq(tmQuotes.id, quote.id))
    .returning();

  if (quote.jobId) {
    await db
      .update(tmJobs)
      .set({
        status: "APPROVED",
        quotedAmountExTax: subtotalExTax,
        updatedAt: now,
      })
      .where(eq(tmJobs.id, quote.jobId));
  }

  await db.insert(tmCommLogs).values({
    id: crypto.randomUUID(),
    entityType: "QUOTE",
    entityId: quote.id,
    channel: "PORTAL",
    direction: "INBOUND",
    recipient: input.signerName,
    subject: `Quote ${quote.quoteNumber} accepted`,
    bodyPreview: `Signed by ${input.signerName}`,
    status: "DELIVERED",
    sentAt: now,
    tenantId: quote.tenantId,
    appId: quote.appId,
    createdAt: now,
    createdBy: quote.createdBy,
    updatedAt: now,
    updatedBy: quote.createdBy,
  });

  if (quote.depositType !== "NONE" && depositAmt > 0) {
    const dep = await createDepositInvoiceForAcceptedQuote(db, updatedQuote, depositAmt);
    return { quote: updatedQuote, ...dep };
  }
  return { quote: updatedQuote, depositInvoice: null, depositPortalToken: null };
}

export async function declineQuoteViaPortalCommand(
  db: DbOrTx,
  input: { rawToken: string; declineReason?: string | null }
) {
  const quote = await findQuoteByToken(db, input.rawToken);
  if (quote.status === "ACCEPTED") throw new Error("Accepted quotes cannot be declined.");
  const now = new Date();
  const [updated] = await db
    .update(tmQuotes)
    .set({
      status: "DECLINED",
      declinedAt: now,
      declineReason: input.declineReason ?? null,
      updatedAt: now,
    })
    .where(eq(tmQuotes.id, quote.id))
    .returning();

  await db.insert(tmCommLogs).values({
    id: crypto.randomUUID(),
    entityType: "QUOTE",
    entityId: quote.id,
    channel: "PORTAL",
    direction: "INBOUND",
    subject: `Quote ${quote.quoteNumber} declined`,
    bodyPreview: input.declineReason ?? "Declined via customer portal",
    status: "DELIVERED",
    sentAt: now,
    tenantId: quote.tenantId,
    appId: quote.appId,
    createdAt: now,
    createdBy: quote.createdBy,
    updatedAt: now,
    updatedBy: quote.createdBy,
  });

  return updated;
}
