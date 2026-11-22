import type {
  CanAffordVerdictType,
  ProjectionEngineBucket,
  ProjectionExpenseEvent,
  ProjectionIncomeEvent,
} from "@kaesava/types";
import { formatDate } from "@kaesava/core";
import { t } from "@kaesava/i18n";
import { getTenantDateString } from "@kaesava/types";
import { toMonthlyAmount } from "../can-afford-simulation.query.js";
import type { RecurringSimulationParams } from "./simulation-types.js";

function fmtMoney(value: number | string, currency: string, locale = "en"): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const fractionDigits = currency === "JPY" ? 0 : 2;
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(fractionDigits)}`;
  }
}

function fmtDateStr(dateStr: string, locale = "en-AU", timezone = "UTC"): string {
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? `${dateStr}T12:00:00Z` : dateStr;
  return formatDate(normalized, { locale, timezone }) || dateStr;
}

export function simulateRecurringCommitment(
  params: RecurringSimulationParams
): CanAffordVerdictType {
  const {
    amount,
    frequency,
    itemName,
    effectiveSpendable,
    everydayBalance,
    safeCushion,
    daysUntilPayday,
    nextPaycheckDateStr,
    totalBillsBeforePayday,
    goalEnvelopes,
    everydayEnvelopes,
    engineBuckets,
    pendingExpensesRaw,
    sortedIncomes,
    projectionEngine,
    today,
    timezone,
    currency,
    locale,
    userId,
  } = params;
  const f = (v: number | string) => fmtMoney(v, currency, locale || "en");
  const fd = (d: string) => fmtDateStr(d, locale || "en-AU", timezone);

  const monthlyAmount = toMonthlyAmount(amount, frequency);
  const isDay1CashTight = amount > effectiveSpendable;
  const startAdvice = isDay1CashTight
    ? t("canIAfford.rationale.startAdviceWaitUntilPayday", { date: fd(nextPaycheckDateStr) })
    : undefined;

  // --- 12-Month Projection Setup ---
  const phantomBucket: ProjectionEngineBucket = {
    id: `__phantom_recurring__`,
    name: itemName ?? "New Recurring Commitment",
    type: "BILL",
    envelopeType: "BILL",
    fundingMode: "RECURRING",
    isPriority: false,
    isSurplusTarget: false,
    monthlyAmount,
    targetAmount: null,
    targetDate: null,
    currentBalance: 0,
    isPrivate: false,
  };

  const baseExpenses: ProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.envelopeId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

  // Inject calendar-matched phantom expense events over 12-month horizon
  const phantomExpenses: ProjectionExpenseEvent[] = [];
  let count = 12;
  if (frequency === "WEEKLY") count = 52;
  else if (frequency === "FORTNIGHTLY") count = 26;
  else if (frequency === "MONTHLY") count = 12;
  else if (frequency === "ANNUALLY") count = 1;

  for (let k = 0; k < count; k++) {
    let d: Date;
    if (frequency === "MONTHLY") {
      const targetYear = today.getUTCFullYear();
      const targetMonth = today.getUTCMonth() + k;
      const originalDay = today.getUTCDate();
      // Use day 1 to safely advance month, then clamp to last day of target month
      d = new Date(Date.UTC(targetYear, targetMonth, 1));
      const daysInTargetMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(originalDay, daysInTargetMonth));
    } else if (frequency === "ANNUALLY") {
      d = new Date(today.getTime());
      d.setUTCFullYear(d.getUTCFullYear() + k);
    } else if (frequency === "WEEKLY") {
      d = new Date(today.getTime() + k * 7 * 24 * 60 * 60 * 1000);
    } else {
      // FORTNIGHTLY
      d = new Date(today.getTime() + k * 14 * 24 * 60 * 60 * 1000);
    }

    phantomExpenses.push({
      poolId: phantomBucket.id,
      amount,
      dueDate: getTenantDateString(d, { timezone }),
      status: "PENDING",
    });
  }

  const cumIncomes: ProjectionIncomeEvent[] = sortedIncomes.map((e) => ({
    id: e.id,
    sourceName: e.sourceName,
    expectedDate: e.expectedDate,
    expectedAmount: parseFloat(e.expectedAmount),
    actualAmount: e.actualAmount ? parseFloat(e.actualAmount) : null,
    status: e.status as "PENDING" | "CONFIRMED" | "DRAFT" | "REVIEWED",
    rrule: e.rrule,
    userId: e.incomeCreatedBy || e.sourceCreatedBy || e.bankAccountUserId || undefined,
    isPrivate: Boolean(e.bankAccountIsPrivate),
    contributionMode: e.incomeContributionMode ?? e.sourceContributionMode ?? "FULL",
    contributionValue: e.incomeContributionValue
      ? parseFloat(e.incomeContributionValue)
      : e.sourceContributionValue
        ? parseFloat(e.sourceContributionValue)
        : null,
  }));

  // Projection WITHOUT phantom — baseline goal final balances
  const projectionWithout = projectionEngine({
    categories: engineBuckets,
    incomeEvents: cumIncomes,
    expenseEvents: baseExpenses,
    currentUserId: userId,
    timezone,
  });

  // Projection WITH phantom bucket & injected expenses
  const projectionWith = projectionEngine({
    categories: [...engineBuckets, phantomBucket],
    incomeEvents: cumIncomes,
    expenseEvents: [...baseExpenses, ...phantomExpenses],
    currentUserId: userId,
    timezone,
  });

  // --- CHECK 1: PHANTOM BUCKET DEFICIT (Bills shortfall across all steps) ---
  const phantomFinalBal = projectionWith.finalBalances.get(phantomBucket.id) ?? 0;
  let minPhantomBal = phantomFinalBal;
  for (const step of projectionWith.steps) {
    const stepMin = step.minProjectedBalances.get(phantomBucket.id) ?? step.balancesAfterExpenses.get(phantomBucket.id) ?? 0;
    if (stepMin < minPhantomBal) minPhantomBal = stepMin;
  }
  if (minPhantomBal < -1) {
    const totalDeficit = Math.abs(minPhantomBal);
    return {
      verdict: "HARD_NO",
      shortfall: totalDeficit.toFixed(2),
      horizonMonths: 12,
      rationaleSteps: [
        t("canIAfford.rationale.hardNoRecurringBills", {
          frequency: frequency.toLowerCase(),
          amount: f(amount),
          monthly: f(monthlyAmount),
        }),
        t("canIAfford.rationale.hardNoRecurringForecastShortfall", { deficit: f(totalDeficit) }),
        t("canIAfford.rationale.hardNoRecurringBillsNonNegotiable"),
      ],
    };
  }

  // --- CHECK 2: EVERYDAY 80% MINIMUM ALLOWANCE PRESERVATION ---
  const everydayEnvelopeIds = new Set<string>(everydayEnvelopes.map((p) => p.id));
  let minEverydayBalance = Infinity;

  for (const step of projectionWith.steps) {
    let everydayAtStep = 0;
    for (const envId of everydayEnvelopeIds) {
      everydayAtStep += step.balancesAfterExpenses.get(envId) ?? 0;
    }
    if (everydayAtStep < minEverydayBalance) {
      minEverydayBalance = everydayAtStep;
    }
  }

  // Sum total everyday allocations across projection steps
  let totalEverydayAllocated = 0;
  for (const step of projectionWith.steps) {
    for (const envId of everydayEnvelopeIds) {
      totalEverydayAllocated += step.allocations.get(envId)?.proposedAmount ?? 0;
    }
  }

  const everydayMonthlyAllowance = everydayEnvelopes.reduce((sum, e) => {
    const amt = parseFloat(e.monthlyAmount ?? e.enteredAmount ?? e.targetAmount ?? "0");
    return sum + amt;
  }, 0);
  const expected12MonthEveryday = everydayMonthlyAllowance * 12;
  const minRequiredEveryday = expected12MonthEveryday * 0.8;

  if (minEverydayBalance < 0 || (expected12MonthEveryday > 0 && totalEverydayAllocated < minRequiredEveryday)) {
    const deficit = Math.max(0, minRequiredEveryday - totalEverydayAllocated);
    return {
      verdict: "HARD_NO",
      shortfall: deficit > 0 ? deficit.toFixed(2) : Math.abs(minEverydayBalance).toFixed(2),
      horizonMonths: 12,
      rationaleSteps: [
        t("canIAfford.rationale.hardNoRecurringEveryday", {
          frequency: frequency.toLowerCase(),
          amount: f(amount),
          monthly: f(monthlyAmount),
        }),
        t("canIAfford.rationale.hardNoRecurringEverydayProtected"),
      ],
    };
  }

  // --- CHECK 3: GOAL DELAYS ("What Gives") ---
  const goalDelays: Array<{
    goalId: string;
    goalName: string;
    isPriority: boolean;
    originalTargetDate: string | null;
    newTargetDate: string | null;
    delayDays: number;
  }> = [];

  for (const pool of goalEnvelopes) {
    if (!pool.targetAmount) continue;

    const originalFinalBalance = projectionWithout.finalBalances.get(pool.id) ?? 0;
    const newFinalBalance = projectionWith.finalBalances.get(pool.id) ?? 0;
    const balanceDrop = originalFinalBalance - newFinalBalance;
    if (balanceDrop <= 0.01) continue;

    const poolMonthlyContrib =
      pool.fundingMode === "RECURRING"
        ? parseFloat(pool.monthlyAmount ?? pool.enteredAmount ?? pool.targetAmount)
        : (pool.monthlyAmount ? parseFloat(pool.monthlyAmount) : parseFloat(pool.targetAmount) / 12);
    const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
    const delayDays = Math.max(1, Math.round(balanceDrop / dailyContrib));

    let newDateStr: string | null = null;
    if (pool.endDate) {
      const originalDate = new Date(pool.endDate + "T00:00:00Z");
      const newDate = new Date(originalDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
      newDateStr = getTenantDateString(newDate, { timezone });
    }

    goalDelays.push({
      goalId: pool.id,
      goalName: pool.name,
      isPriority: pool.isPriority ?? false,
      originalTargetDate: pool.endDate,
      newTargetDate: newDateStr,
      delayDays,
    });
  }

  if (goalDelays.length > 0) {
    return {
      verdict: "GOAL_DELAYED",
      isAffordable: true,
      goalDelays,
      recurringMonthlyImpact: monthlyAmount.toFixed(2),
      startAdvice,
      rationaleSteps: [
        t("canIAfford.rationale.goalDelayedIntro", {
          frequency: frequency.toLowerCase(),
          amount: f(amount),
          monthly: f(monthlyAmount),
        }),
        t("canIAfford.rationale.goalDelayedProtected"),
        t("canIAfford.rationale.goalDelayedAbsorbedHeader", { count: goalDelays.length }),
        ...goalDelays.map((g) =>
          t("canIAfford.rationale.goalDelayedItem", {
            goalName: g.goalName,
            tier: g.isPriority ? t("canIAfford.rationale.goalTierPriority") : t("canIAfford.rationale.goalTierStandard"),
            delayDays: g.delayDays,
          })
        ),
        ...(startAdvice ? [startAdvice] : []),
      ],
    };
  }

  // Recurring affordable with zero goal delays
  const remaining = effectiveSpendable - amount;
  return {
    verdict: "SAFE_YES",
    availableCash: everydayBalance.toFixed(2),
    effectiveSpendable: effectiveSpendable.toFixed(2),
    everydayRemaining: remaining.toFixed(2),
    safeCushion,
    daysUntilPayday,
    nextPaydayDate: nextPaycheckDateStr,
    upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
    startAdvice,
    rationaleSteps: [
      t("canIAfford.rationale.safeYesRecurringIntro", {
        frequency: frequency.toLowerCase(),
        amount: f(amount),
        monthly: f(monthlyAmount),
      }),
      t("canIAfford.rationale.safeYesRecurringFunded"),
      ...(startAdvice ? [startAdvice] : []),
    ],
  };
}
