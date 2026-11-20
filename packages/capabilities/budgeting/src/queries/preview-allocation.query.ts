import { envelopes, incomeEvents, incomeSources, expenseEvents, bankAccounts, tenants, allocationPlans, allocationPlanLines, getEnvelopeBalancesMap, DbOrTx } from "@money-matters/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import { runAllocationEngine, EngineBucket } from "../engine/allocation-engine.js";
import { runCumulativeProjection, CumulativeProjectionIncomeEvent } from "../engine/cumulative-projection.js";
import { parseRruleFrequencyDays } from "../commands/run-allocation.command.js";
import { getTenantDateString } from "@money-matters/core";
import { SUPPORTED_CURRENCIES, DEFAULT_TIMEZONE } from "@money-matters/types";

export async function previewAllocationQuery(
  tenantId: string,
  appId: string,
  incomeEventId: string,
  incomeAmount: number,
  dbClient: DbOrTx,
  runwayDays?: number,
  userId?: string
) {
  // 0. Fetch Tenant for currency and timezone
  const [tenantRecord] = await dbClient
    .select({ timezone: tenants.timezone, currency: tenants.currency })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const tenantTz = tenantRecord?.timezone || DEFAULT_TIMEZONE;
  const currencyCode = tenantRecord?.currency || "AUD";
  const currencySymbol = SUPPORTED_CURRENCIES[currencyCode]?.symbol || "$";

  // 1. Fetch Envelopes joined with bankAccounts
  const rawEnvelopes = await dbClient
    .select({
      envelope: envelopes,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(envelopes)
    .leftJoin(bankAccounts, eq(envelopes.bankAccountId, bankAccounts.id))
    .where(
      and(
        eq(envelopes.tenantId, tenantId),
        eq(envelopes.appId, appId),
        sql`${envelopes.archivedAt} IS NULL`
      )
    );

  const dbEnvelopes = rawEnvelopes
    .filter((row) => {
      if (!userId) return true;
      if (row.envelope.isPrivate && row.envelope.userId !== userId) return false;
      if (row.bankAccountIsPrivate && row.bankAccountUserId !== userId) return false;
      return true;
    })
    .map((row) => row.envelope);

  // 2. Compute balances using DB-side aggregate SUM(CASE WHEN...)
  const balancesMap = await getEnvelopeBalancesMap(tenantId, appId, dbClient);

  // 3. Fetch income event joined with income source and bank account
  const [event] = await dbClient
    .select({
      id: incomeEvents.id,
      expectedDate: incomeEvents.expectedDate,
      status: incomeEvents.status,
      rrule: incomeSources.rrule,
      incomeType: incomeSources.incomeType,
      contributionMode: sql<"FULL" | "PERCENTAGE" | "FIXED_AMOUNT">`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
      contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
      createdBy: incomeEvents.createdBy,
      sourceCreatedBy: incomeSources.createdBy,
      bankAccountIsPrivate: bankAccounts.isPrivate,
      bankAccountUserId: bankAccounts.userId,
    })
    .from(incomeEvents)
    .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
    .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
    .where(eq(incomeEvents.id, incomeEventId));

  if (
    userId &&
    event?.bankAccountIsPrivate &&
    event.bankAccountUserId !== userId
  ) {
    throw new Error("Target income event not found.");
  }

  const rawCreator = event?.createdBy && event.createdBy !== "system" ? event.createdBy : undefined;
  const rawSourceCreator = event?.sourceCreatedBy && event.sourceCreatedBy !== "system" ? event.sourceCreatedBy : undefined;
  const incomeUserId = event?.bankAccountIsPrivate
    ? (event.bankAccountUserId || userId)
    : (rawCreator ?? rawSourceCreator ?? userId);

  let freqDays = 14;
  if (event?.rrule) {
    freqDays = parseRruleFrequencyDays(event.rrule);
  }

  const bufferDays = 3;
  const eventTime = event ? new Date(event.expectedDate + "T12:00:00Z").getTime() : Date.now();
  const forwardWindowDays = 90;
  const forwardCutoffDateStr = getTenantDateString(new Date(eventTime + forwardWindowDays * 24 * 60 * 60 * 1000), { timezone: tenantTz });

  const pendingExpenses = await dbClient
    .select({
      id: expenseEvents.id,
      envelopeId: expenseEvents.envelopeId,
      name: expenseEvents.name,
      amount: expenseEvents.expectedAmount,
      dueDate: expenseEvents.expectedDate,
    })
    .from(expenseEvents)
    .where(
      and(
        eq(expenseEvents.tenantId, tenantId),
        eq(expenseEvents.appId, appId),
        eq(expenseEvents.status, "PENDING"),
        sql`${expenseEvents.expectedDate} <= ${forwardCutoffDateStr}`,
        sql`${expenseEvents.archivedAt} IS NULL`
      )
    );

  const visibleEnvelopeIds = new Set(dbEnvelopes.map((e) => e.id));
  const filteredPendingExpenses = pendingExpenses.filter((e) => visibleEnvelopeIds.has(e.envelopeId));

  const { mapEnvelopeToEngineBucket } = await import("../engine/envelope-engine-mapper.js");
  const { getActiveAllocationStrategyQuery } = await import("./get-active-allocation-strategy.query.js");
  const activeStrategy = await getActiveAllocationStrategyQuery(tenantId, appId, userId, dbClient);

  const isPrivateAccount = Boolean(event?.bankAccountIsPrivate);
  const allVisibleEngineBuckets: EngineBucket[] = dbEnvelopes.map((env) =>
    mapEnvelopeToEngineBucket(env, balancesMap[env.id] || 0)
  );
  const engineBuckets: EngineBucket[] = isPrivateAccount
    ? allVisibleEngineBuckets
    : allVisibleEngineBuckets.filter((env) => !env.isPrivate);

  const strategySteps = activeStrategy?.steps?.map((s) => ({
    stepType: s.stepType,
    targetEnvelopeId: s.targetEnvelopeId,
    config: s.config as Record<string, unknown> | null,
  }));

  if (event && event.status !== "CONFIRMED") {
    const priorPendingRaw = await dbClient
      .select({
        id: incomeEvents.id,
        expectedDate: incomeEvents.expectedDate,
        expectedAmount: incomeEvents.expectedAmount,
        actualAmount: incomeEvents.actualAmount,
        status: incomeEvents.status,
        rrule: incomeSources.rrule,
        incomeType: incomeSources.incomeType,
        contributionMode: sql<"FULL" | "PERCENTAGE" | "FIXED_AMOUNT">`COALESCE(${incomeEvents.contributionMode}, ${incomeSources.contributionMode}, 'FULL')`,
        contributionValue: sql<string | null>`COALESCE(${incomeEvents.contributionValue}, ${incomeSources.contributionValue})`,
        createdBy: incomeEvents.createdBy,
        sourceCreatedBy: incomeSources.createdBy,
        bankAccountIsPrivate: bankAccounts.isPrivate,
        bankAccountUserId: bankAccounts.userId,
      })
      .from(incomeEvents)
      .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
      .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
      .where(
        and(
          eq(incomeEvents.tenantId, tenantId),
          eq(incomeEvents.appId, appId),
          sql`${incomeEvents.status} != 'CONFIRMED'`,
          sql`${incomeEvents.archivedAt} IS NULL`
        )
      );

    const visiblePending = (priorPendingRaw || []).filter(
      (p) => !userId || !p.bankAccountIsPrivate || p.bankAccountUserId === userId
    );

    if (visiblePending.length > 1) {
      const priorEventIds = visiblePending.filter((p) => p.id !== incomeEventId).map((p) => p.id);
      const cellOverrides: Record<string, number> = {};
      if (priorEventIds.length > 0) {
        const priorSavedRows = await dbClient
          .select({
            incomeEventId: allocationPlans.incomeEventId,
            envelopeId: allocationPlanLines.envelopeId,
            proposedAmount: allocationPlanLines.proposedAmount,
            confirmedAmount: allocationPlanLines.confirmedAmount,
          })
          .from(allocationPlans)
          .innerJoin(allocationPlanLines, eq(allocationPlans.id, allocationPlanLines.planId))
          .where(
            and(
              eq(allocationPlans.tenantId, tenantId),
              eq(allocationPlans.appId, appId),
              eq(allocationPlans.status, "PENDING"),
              inArray(allocationPlans.incomeEventId, priorEventIds),
              sql`${allocationPlans.archivedAt} IS NULL`
            )
          );
        for (const row of priorSavedRows || []) {
          if (visibleEnvelopeIds.has(row.envelopeId)) {
            cellOverrides[`${row.incomeEventId}_${row.envelopeId}`] = parseFloat(row.confirmedAmount || row.proposedAmount || "0");
          }
        }
      }

      const cumIncomes: CumulativeProjectionIncomeEvent[] = visiblePending.map((p) => {
        const isTarget = p.id === incomeEventId;
        const pCreator = p.createdBy && p.createdBy !== "system" ? p.createdBy : undefined;
        const pSourceCreator = p.sourceCreatedBy && p.sourceCreatedBy !== "system" ? p.sourceCreatedBy : undefined;
        const pUserId = p.bankAccountIsPrivate ? (p.bankAccountUserId || userId) : (pCreator ?? pSourceCreator ?? userId);
        const pActual = p.actualAmount ? parseFloat(p.actualAmount) : null;
        return {
          id: p.id,
          expectedDate: p.expectedDate,
          expectedAmount: isTarget ? incomeAmount : parseFloat(p.expectedAmount),
          actualAmount: isTarget ? incomeAmount : (pActual && pActual > 0 ? pActual : null),
          status: (p.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED") || "PENDING",
          rrule: p.rrule,
          incomeType: p.incomeType,
          userId: pUserId,
          isPrivate: Boolean(p.bankAccountIsPrivate),
          contributionMode: p.contributionMode || "FULL",
          contributionValue: p.contributionValue ? parseFloat(p.contributionValue) : null,
        };
      });

      const cumResult = runCumulativeProjection({
        categories: allVisibleEngineBuckets,
        incomeEvents: cumIncomes,
        expenseEvents: filteredPendingExpenses.map((e) => ({
          envelopeId: e.envelopeId,
          poolId: e.envelopeId,
          categoryId: e.envelopeId,
          amount: parseFloat(e.amount),
          dueDate: e.dueDate,
          status: "PENDING",
        })),
        cellOverrides,
        currentUserId: userId,
        timezone: tenantTz,
        currencySymbol,
        strategySteps,
        runwayDays: runwayDays ?? 30,
        dueBufferDays: bufferDays,
      });

      const targetStep = cumResult.getStepForEvent(incomeEventId);
      if (targetStep) {
        const lines = engineBuckets.map((b) => {
          const alloc = targetStep.allocations.get(b.id);
          return {
            bucketId: b.id,
            bucketName: b.name,
            proposedAmount: alloc?.proposedAmount ?? 0,
            reasoning: alloc?.reasoning ?? "",
          };
        });
        return {
          status: "OK" as const,
          lines,
          unallocatedAmount: targetStep.unallocatedAmount,
        };
      }
    }
  }

  const output = runAllocationEngine({
    incomeAmount,
    incomeType: event?.incomeType || "SALARIED",
    incomeUserId,
    contributionMode: isPrivateAccount ? (event?.contributionMode || "FULL") : "FULL",
    contributionValue: isPrivateAccount && event?.contributionValue ? parseFloat(event.contributionValue) : null,
    strategySteps,
    runwayDays: runwayDays ?? 30,
    buckets: engineBuckets,
    paycheckDate: event ? new Date(event.expectedDate + "T00:00:00Z") : new Date(),
    paycheckFrequencyDays: freqDays,
    dueBufferDays: bufferDays,
    timezone: tenantTz,
    currencySymbol,
    upcomingExpenses: filteredPendingExpenses.map((e) => ({
      envelopeId: e.envelopeId,
      name: e.name,
      amount: parseFloat(e.amount),
      dueDate: e.dueDate,
    })),
  });

  return output;
}
