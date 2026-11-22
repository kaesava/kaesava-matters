import { incomeSources, incomeEvents, bankAccounts, type DbOrTx } from "@kaesava/db";
import { and, eq, sql, asc } from "drizzle-orm";
import {
  verifyReceivingAccountAccess,
  type ContributionMode,
} from "./income-sources.command.js";
import { resolveValidatedIncomeContribution } from "./income-contribution.helper.js";
import { archivePendingPlansForIncomeEvent } from "./archive-pending-plans.helper.js";

async function loadVisibleIncomeEvent(eventId: string, tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const [evt] = await db
    .select({
      id: incomeEvents.id,
      incomeSourceId: incomeEvents.incomeSourceId,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      contributionMode: incomeEvents.contributionMode,
      contributionValue: incomeEvents.contributionValue,
      status: incomeEvents.status,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeEvents.id, eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.archivedAt} IS NULL`))
    .limit(1);

  if (!evt || (evt.bankAccountIsPrivate && evt.bankAccountUserId !== userId)) {
    throw new Error("Income event not found.");
  }
  return evt;
}

export async function createIncomeEventCommand(
  input: {
    incomeSourceId?: string;
    name?: string;
    expectedDate: string;
    expectedAmount: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  if (input.incomeSourceId) {
    const [source] = await db
      .select({ bankAccountIsPrivate: bankAccounts.isPrivate, bankAccountUserId: bankAccounts.userId })
      .from(incomeSources)
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(and(eq(incomeSources.id, input.incomeSourceId), eq(incomeSources.tenantId, tenantId), eq(incomeSources.appId, appId), sql`${incomeSources.archivedAt} IS NULL`));

    if (!source || (source.bankAccountIsPrivate && source.bankAccountUserId !== userId)) {
      throw new Error("Income source not found.");
    }
  }

  const [event] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: input.incomeSourceId,
      name: input.name || null,
      expectedDate: input.expectedDate,
      actualDate: input.expectedDate,
      expectedAmount: input.expectedAmount,
      actualAmount: input.expectedAmount,
      contributionMode: input.contributionMode || "FULL",
      contributionValue: input.contributionValue || null,
      status: "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();
  return event;
}

export async function listIncomeEventsQuery(tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const events = await db
    .select({
      id: incomeEvents.id,
      name: sql<string>`COALESCE(NULLIF(${incomeEvents.name}, ''), ${incomeSources.name}, 'Paycheck')`,
      expectedDate: incomeEvents.expectedDate,
      actualDate: incomeEvents.actualDate,
      expectedAmount: incomeEvents.expectedAmount,
      actualAmount: incomeEvents.actualAmount,
      contributionMode: sql<string>`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
      contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
      status: incomeEvents.status,
      note: incomeEvents.note,
      incomeSourceId: incomeEvents.incomeSourceId,
      sourceName: incomeSources.name,
      bankAccountId: incomeSources.receivingAccountId,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
      createdBy: incomeEvents.createdBy,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(and(eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId), sql`${incomeEvents.archivedAt} IS NULL`))
    .orderBy(asc(incomeEvents.expectedDate));

  const visibleEvents = events.filter((e) => {
    if (e.bankAccountId && e.bankAccountIsPrivate === null) return false;
    if (e.bankAccountIsPrivate && e.bankAccountUserId !== userId) return false;
    if (!e.incomeSourceId && e.createdBy && e.createdBy !== userId) return false;
    return true;
  });

  const nextId = visibleEvents.find((e) => e.status === "PENDING")?.id;
  return visibleEvents.map((e) => ({ ...e, isNextPayday: e.id === nextId }));
}

export async function createUpcomingIncomeCommand(
  input: {
    name: string;
    amount: string;
    expectedDate: string;
    receivingAccountId?: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
    note?: string;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  if (input.receivingAccountId) {
    await verifyReceivingAccountAccess(input.receivingAccountId, tenantId, appId, userId, db);
  }
  const resolvedContribution = await resolveValidatedIncomeContribution({
    mode: input.contributionMode,
    value: input.contributionValue,
    totalAmount: input.amount,
    receivingAccountId: input.receivingAccountId,
    tenantId,
    appId,
    userId,
    db,
  });

  const [source] = await db
    .insert(incomeSources)
    .values({
      name: input.name,
      amount: input.amount,
      receivingAccountId: input.receivingAccountId || null,
      rrule: null,
      startDate: input.expectedDate,
      contributionMode: resolvedContribution.contributionMode,
      contributionValue: resolvedContribution.contributionValue,
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  const [evt] = await db
    .insert(incomeEvents)
    .values({
      incomeSourceId: source.id,
      name: input.name,
      expectedDate: input.expectedDate,
      actualDate: input.expectedDate,
      expectedAmount: input.amount,
      actualAmount: input.amount,
      contributionMode: resolvedContribution.contributionMode,
      contributionValue: resolvedContribution.contributionValue,
      note: input.note || null,
      status: "PENDING",
      tenantId,
      appId,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  return evt;
}

export async function updateUpcomingIncomeCommand(
  input: {
    eventId: string;
    expectedAmount?: string;
    expectedDate?: string;
    contributionMode?: ContributionMode;
    contributionValue?: string | null;
  },
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
) {
  const existing = await loadVisibleIncomeEvent(input.eventId, tenantId, appId, userId, db);
  if (existing.status === "CONFIRMED") {
    throw new Error("Confirmed events are locked and cannot be edited or deleted.");
  }
  const isScheduled = Boolean(existing.incomeSourceId);
  const setPayload: Record<string, unknown> = { updatedAt: new Date(), updatedBy: userId };

  if (input.expectedAmount !== undefined) {
    setPayload.actualAmount = input.expectedAmount;
    if (!isScheduled) setPayload.expectedAmount = input.expectedAmount;
  }
  if (input.expectedDate !== undefined) {
    setPayload.actualDate = input.expectedDate;
    if (!isScheduled) setPayload.expectedDate = input.expectedDate;
  }
  if (input.contributionMode !== undefined) {
    setPayload.contributionMode = input.contributionMode;
  }
  if (input.contributionValue !== undefined) {
    setPayload.contributionValue = input.contributionValue;
  }

  const prevAmt = Number(existing.actualAmount ?? existing.expectedAmount ?? 0);
  const nextAmt = input.expectedAmount !== undefined ? Number(input.expectedAmount) : prevAmt;
  const amountChanged = input.expectedAmount !== undefined && Number.isFinite(nextAmt) && Math.abs(nextAmt - prevAmt) > 0.005;
  const contributionChanged =
    (input.contributionMode !== undefined && input.contributionMode !== existing.contributionMode) ||
    (input.contributionValue !== undefined && input.contributionValue !== existing.contributionValue);

  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(incomeEvents)
      .set(setPayload)
      .where(and(eq(incomeEvents.id, input.eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)))
      .returning();

    if (amountChanged || contributionChanged) {
      await archivePendingPlansForIncomeEvent(input.eventId, tenantId, appId, userId, tx);
    }
    return updated;
  });
}

export async function deleteIncomeEventCommand(eventId: string, tenantId: string, appId: string, userId: string, db: DbOrTx) {
  const existing = await loadVisibleIncomeEvent(eventId, tenantId, appId, userId, db);
  if (existing.status === "CONFIRMED") {
    throw new Error("Confirmed events are locked and cannot be edited or deleted.");
  }
  await db.transaction(async (tx) => {
    await tx
      .update(incomeEvents)
      .set({ archivedAt: new Date(), archivedBy: userId, updatedAt: new Date(), updatedBy: userId })
      .where(and(eq(incomeEvents.id, eventId), eq(incomeEvents.tenantId, tenantId), eq(incomeEvents.appId, appId)));
    await archivePendingPlansForIncomeEvent(eventId, tenantId, appId, userId, tx);
  });
  return { success: true };
}
