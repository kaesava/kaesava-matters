import type {
  CanAffordVerdictType,
  OneOffGoalAlternative,
  ProjectionExpenseEvent,
  ProjectionIncomeEvent,
} from "@kaesava/types";
import { getTenantDateString } from "@kaesava/types";
import { formatDate } from "@kaesava/core";
import { t } from "@kaesava/i18n";
import type { OneOffSimulationParams } from "./simulation-types.js";

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

export function simulateOneOffPurchase(
  params: OneOffSimulationParams
): CanAffordVerdictType {
  const {
    amount,
    includePersonal,
    effectiveSpendable,
    everydayBalance,
    safeCushion,
    safeCushionVal,
    daysUntilPayday,
    nextPaycheckDateStr,
    totalBillsBeforePayday,
    billsDueBeforePayday,
    goalEnvelopes,
    everydayEnvelopes,
    visibleEnvelopes,
    engineBuckets,
    envelopeBalancesMap,
    pendingExpensesRaw,
    sortedIncomes,
    dailyAllowance,
    projectionEngine,
    timezone,
    currency,
    locale,
    userId,
  } = params;
  const f = (v: number | string) => fmtMoney(v, currency, locale || "en");
  const fd = (d: string) => fmtDateStr(d, locale || "en-AU", timezone);

  // ── 1. BILLS RISK CHECK ──────────────────────────────────────
  if (amount <= everydayBalance && amount > effectiveSpendable) {
    const billsDueItems = billsDueBeforePayday.map((e) => ({
      name: e.name,
      amount: parseFloat(e.expectedAmount).toFixed(2),
      dueDate: e.expectedDate,
    }));

    return {
      verdict: "BILLS_RISK",
      availableCash: everydayBalance.toFixed(2),
      upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
      effectiveAfterBills: effectiveSpendable.toFixed(2),
      billsDueItems,
      rationaleSteps: [
        t("canIAfford.rationale.everydayBalance", { balance: f(everydayBalance), personalSuffix: "" }),
        t("canIAfford.rationale.upcomingBillsRisk", {
          bills: f(totalBillsBeforePayday),
          names: billsDueItems.map((b) => b.name).join(", "),
        }),
        t("canIAfford.rationale.netSafeToSpendInsufficient", {
          spendable: f(effectiveSpendable),
          amount: f(amount),
        }),
        t("canIAfford.rationale.billsNonNegotiable"),
      ],
    };
  }

  // ── 2. IMMEDIATE AFFORDABILITY CHECK ───────────────────────
  if (amount <= effectiveSpendable) {
    const remaining = effectiveSpendable - amount;
    const everydayRemaining = remaining.toFixed(2);

    if (remaining >= safeCushionVal) {
      return {
        verdict: "SAFE_YES",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        safeCushion,
        daysUntilPayday,
        nextPaydayDate: nextPaycheckDateStr,
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps: [
          t("canIAfford.rationale.everydayBalance", {
            balance: f(everydayBalance),
            personalSuffix: includePersonal ? t("canIAfford.includesPersonalEnvelopes") : "",
          }),
          t("canIAfford.rationale.upcomingBillsProtected", { bills: f(totalBillsBeforePayday) }),
          t("canIAfford.rationale.afterPurchaseRemaining", {
            remaining: f(everydayRemaining),
            date: fd(nextPaycheckDateStr),
          }),
          t("canIAfford.rationale.aboveSafeCushion", { cushion: f(safeCushion) }),
        ],
      };
    } else {
      const cushionShortfall = (safeCushionVal - remaining).toFixed(2);
      return {
        verdict: "PACING_TIGHT",
        availableCash: everydayBalance.toFixed(2),
        effectiveSpendable: effectiveSpendable.toFixed(2),
        everydayRemaining,
        safeCushion,
        cushionShortfall,
        daysUntilPayday,
        nextPaydayDate: nextPaycheckDateStr,
        upcomingBillsBeforePayday: totalBillsBeforePayday.toFixed(2),
        rationaleSteps: [
          t("canIAfford.rationale.everydayBalance", { balance: f(everydayBalance), personalSuffix: "" }),
          t("canIAfford.rationale.upcomingBillsProtected", { bills: f(totalBillsBeforePayday) }),
          t("canIAfford.rationale.afterPurchaseTightRemaining", {
            remaining: f(everydayRemaining),
            days: daysUntilPayday,
            date: fd(nextPaycheckDateStr),
          }),
          t("canIAfford.rationale.belowSafeCushion", {
            shortfall: f(cushionShortfall),
            cushion: f(safeCushion),
          }),
        ],
      };
    }
  }

  // ── 3. SHORTFALL TODAY — CHECK SAVINGS GOALS & FUTURE PAYDAYS ─
  const shortfall = amount - effectiveSpendable;

  const flexibleGoals = goalEnvelopes.filter((p) => !p.isPriority && (envelopeBalancesMap[p.id] ?? 0) > 0);
  flexibleGoals.sort((a, b) => (envelopeBalancesMap[b.id] ?? 0) - (envelopeBalancesMap[a.id] ?? 0));
  const candidateGoal = flexibleGoals[0] ?? null;

  let goalAlternative: OneOffGoalAlternative | undefined = undefined;
  if (candidateGoal) {
    const goalBal = envelopeBalancesMap[candidateGoal.id] ?? 0;
    if (goalBal >= shortfall) {
      const poolMonthlyContrib =
        candidateGoal.fundingMode === "RECURRING"
          ? parseFloat(candidateGoal.monthlyAmount ?? candidateGoal.enteredAmount ?? candidateGoal.targetAmount ?? "0")
          : (candidateGoal.monthlyAmount ? parseFloat(candidateGoal.monthlyAmount) : (candidateGoal.targetAmount ? parseFloat(candidateGoal.targetAmount) / 12 : 0));
      const dailyContrib = poolMonthlyContrib > 0 ? poolMonthlyContrib / 30 : 1;
      const delayDays = Math.max(1, Math.round(shortfall / dailyContrib));

      let newTargetDate: string | null = null;
      if (candidateGoal.endDate) {
        const origDate = new Date(candidateGoal.endDate + "T00:00:00Z");
        const nDate = new Date(origDate.getTime() + delayDays * 24 * 60 * 60 * 1000);
        newTargetDate = getTenantDateString(nDate, { timezone });
      }

      goalAlternative = {
        goalId: candidateGoal.id,
        goalName: candidateGoal.name,
        availableGoalBalance: goalBal.toFixed(2),
        shortfallCovered: shortfall.toFixed(2),
        delayDays,
        newTargetDate,
      };
    }
  }

  // Run cumulative projection to find earliest paycycle where Everyday cash accumulates enough
  const cumExpenses: ProjectionExpenseEvent[] = pendingExpensesRaw.map((e) => ({
    poolId: e.envelopeId,
    dueDate: e.expectedDate,
    amount: parseFloat(e.expectedAmount),
    status: e.status as "PENDING" | "CONFIRMED",
  }));

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

  const projection = projectionEngine({
    categories: engineBuckets,
    incomeEvents: cumIncomes,
    expenseEvents: cumExpenses,
    currentUserId: userId,
    timezone,
  });

  const everydayEnvelopeIds = new Set<string>(everydayEnvelopes.map((p) => p.id));
  const surplusEnvelope = visibleEnvelopes.find((p) => p.isSurplusTarget);
  const ordinals = ["st", "nd", "rd"];

  for (let i = 0; i < projection.steps.length; i++) {
    const step = projection.steps[i];

    let daysInStep = 14;
    if (i < projection.steps.length - 1) {
      const tCurr = new Date(step.date + "T00:00:00Z").getTime();
      const tNext = new Date(projection.steps[i + 1].date + "T00:00:00Z").getTime();
      daysInStep = Math.max(1, Math.round((tNext - tCurr) / (1000 * 60 * 60 * 24)));
    }
    const stepCushion = dailyAllowance > 0 ? dailyAllowance * 0.25 * daysInStep : 15 * daysInStep;

    const paycyclesAway = i + 1;
    const ordinal = ordinals[i] ?? "th";

    // TIER 1: Check fresh discretionary capacity OR cumulative Everyday + Surplus capacity at this payday
    let freshEveryday = 0;
    let accumulatedEveryday = 0;
    for (const envId of everydayEnvelopeIds) {
      freshEveryday += step.allocations.get(envId)?.proposedAmount ?? 0;
      accumulatedEveryday += step.balancesAfterAlloc.get(envId) ?? 0;
    }
    const freshSurplus = surplusEnvelope ? (step.allocations.get(surplusEnvelope.id)?.proposedAmount ?? 0) : 0;
    const accumulatedSurplusAtAlloc = surplusEnvelope ? (step.balancesAfterAlloc.get(surplusEnvelope.id) ?? 0) : 0;
    const freshDiscretionary = freshEveryday + freshSurplus;
    const cumulativeDiscretionary = Math.max(freshDiscretionary, accumulatedEveryday + accumulatedSurplusAtAlloc);

    if (cumulativeDiscretionary - amount >= stepCushion) {
      const paycycleLabel = paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`;
      const rationaleSteps = [
        t("canIAfford.rationale.shortfallCurrent", {
          spendable: f(effectiveSpendable),
          shortfall: f(shortfall),
        }),
        t("canIAfford.rationale.waitForPaycycleDiscretionary", {
          paycycleLabel,
          date: fd(step.date),
          discretionary: f(cumulativeDiscretionary),
        }),
      ];

      if (goalAlternative) {
        rationaleSteps.push(
          t("canIAfford.rationale.goalAlternativeOption", {
            shortfall: f(shortfall),
            goalName: goalAlternative.goalName,
            delayDays: goalAlternative.delayDays,
          })
        );
      }

      return {
        verdict: "WAIT_FOR_PAYCYCLE",
        canAffordAt: step.date,
        paycyclesAway,
        projectedEverydayAtThatDate: cumulativeDiscretionary.toFixed(2),
        shortfallToday: shortfall.toFixed(2),
        goalAlternative,
        rationaleSteps,
      };
    }

    // TIER 2: Check accumulated Surplus savings
    const accumulatedSurplus = surplusEnvelope ? (step.balancesAfterExpenses.get(surplusEnvelope.id) ?? 0) : 0;
    if (accumulatedSurplus >= amount) {
      const paycycleLabel = paycyclesAway === 1 ? "next" : `${paycyclesAway}${ordinal}`;
      const rationaleSteps = [
        t("canIAfford.rationale.shortfallCurrent", {
          spendable: f(effectiveSpendable),
          shortfall: f(shortfall),
        }),
        t("canIAfford.rationale.waitForPaycycleSurplus", {
          paycycleLabel,
          date: fd(step.date),
          surplusName: surplusEnvelope?.name ?? "",
          surplus: f(accumulatedSurplus),
        }),
      ];

      if (goalAlternative) {
        rationaleSteps.push(
          t("canIAfford.rationale.goalAlternativeOption", {
            shortfall: f(shortfall),
            goalName: goalAlternative.goalName,
            delayDays: goalAlternative.delayDays,
          })
        );
      }

      return {
        verdict: "WAIT_FOR_PAYCYCLE",
        canAffordAt: step.date,
        paycyclesAway,
        projectedEverydayAtThatDate: accumulatedSurplus.toFixed(2),
        shortfallToday: shortfall.toFixed(2),
        goalAlternative,
        rationaleSteps,
      };
    }
  }

  // ── 4. HARD_NO: 12-month horizon exhausted ───────────────────────────
  return {
    verdict: "HARD_NO",
    shortfall: shortfall.toFixed(2),
    horizonMonths: 12,
    rationaleSteps: [
      t("canIAfford.rationale.shortfallCurrent", {
        spendable: f(effectiveSpendable),
        shortfall: f(shortfall),
      }),
      t("canIAfford.rationale.hardNoOneOff", { amount: f(amount) }),
      t("canIAfford.rationale.hardNoOneOffAdvice"),
    ],
  };
}
