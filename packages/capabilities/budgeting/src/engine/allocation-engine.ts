import { t } from "@money-matters/i18n";
import { EnvelopeType, FundingMode, AllocationStepType } from "@money-matters/types";
import { getTenantDateString } from "@money-matters/core";
import { isBillsBucket, isGoalBucket, isEverydayBucket } from "./envelope-engine-mapper.js";
import { toCents, toDollars, calculateCycleFactor } from "./allocation-engine-utils.js";
import {
  StepContext,
  runStep1ImmediateBills,
  runStep2DeficitRepair,
  runStep3BillsSafetyFloor,
  runStep4EverydayAllowance,
  runStep5ProRataBills,
  runStep6Goals,
  runStepFixedAmount,
  runStepPercentageSplit,
  runStep7SurplusSweep,
} from "./allocation-engine-steps.js";

export { isBillsBucket, isGoalBucket, isEverydayBucket };

export type BucketType = EnvelopeType;

export interface UpcomingExpenseItem {
  id?: string;
  envelopeId?: string | null;
  poolId?: string | null;
  categoryId?: string | null;
  name?: string;
  amount: number;
  dueDate: string;
  isPriority?: boolean;
}

export interface EngineBucket {
  id: string;
  name: string;
  type: BucketType;
  envelopeType?: EnvelopeType;
  fundingMode?: FundingMode;
  userId?: string;
  isPrivate?: boolean;
  isPriority?: boolean;
  isSurplusTarget?: boolean;
  monthlyAmount?: number | null;
  enteredAmount?: number | null;
  targetAmount?: number | null;
  safetyBufferFloor?: number | null;
  targetDate?: string | null;
  dueDate?: string | null;
  currentBalance: number;
}


export interface AllocationLine {
  bucketId: string;
  bucketName: string;
  proposedAmount: number;
  sweptAmount?: number;
  reasoning: string;
}

export interface AllocationStrategyStepItem {
  stepType: AllocationStepType;
  targetEnvelopeId?: string | null;
  config?: Record<string, unknown> | null;
}

export interface AllocationEngineInput {
  incomeAmount: number;
  incomeUserId?: string;
  incomeType?: "SALARIED" | "IRREGULAR";
  contributionMode?: "FULL" | "PERCENTAGE" | "FIXED_AMOUNT";
  contributionValue?: number | string | null;
  strategySteps?: AllocationStrategyStepItem[];
  personalStrategySteps?: AllocationStrategyStepItem[];
  runwayDays?: number;
  buckets: EngineBucket[];
  paycheckDate: Date;
  paycheckFrequencyDays: number;
  daysUntilNextIncome?: number;
  nextPaycheckDate?: Date;
  dueBufferDays?: number;
  upcomingExpenses?: UpcomingExpenseItem[];
  currencySymbol?: string;
  timezone?: string;
}

export interface AllocationEngineOutput {
  status: "OK" | "INSUFFICIENT";
  lines: AllocationLine[];
  unallocatedAmount: number;
}

export function runAllocationEngine(input: AllocationEngineInput): AllocationEngineOutput {
  const isIrregular = input.incomeType === "IRREGULAR";
  const regularCycleDays = isIrregular ? (input.runwayDays ?? 30) : input.paycheckFrequencyDays;
  const cycleFactor = calculateCycleFactor(regularCycleDays, isIrregular);
  const bufferDays = input.dueBufferDays ?? 3;

  const baseNextCutoffTime = input.nextPaycheckDate
    ? input.nextPaycheckDate.getTime()
    : input.paycheckDate.getTime() + (input.daysUntilNextIncome ?? regularCycleDays) * 24 * 60 * 60 * 1000;

  const bufferedCutoffTime = baseNextCutoffTime + bufferDays * 24 * 60 * 60 * 1000;
  const targetTz = input.timezone || "UTC";
  const bufferedCutoffDateStr = getTenantDateString(new Date(bufferedCutoffTime), { timezone: targetTz });

  const allExpenses = input.upcomingExpenses ?? [];
  const immediateExpenses = allExpenses.filter((e) => e && e.dueDate && e.dueDate.slice(0, 10) <= bufferedCutoffDateStr);
  const futureExpenses = allExpenses.filter((e) => e && e.dueDate && e.dueDate.slice(0, 10) > bufferedCutoffDateStr);

  const envImmediateExpensesMap = new Map<string, number>();
  for (const exp of immediateExpenses) {
    const targetId = exp.envelopeId || exp.poolId;
    if (!targetId) continue;
    envImmediateExpensesMap.set(targetId, (envImmediateExpensesMap.get(targetId) ?? 0) + toCents(exp.amount));
  }

  const linesMap = new Map<string, { bucketName: string; amountCents: number; sweptCents?: number; reasonings: string[] }>();
  const runningBalances = new Map<string, number>();
  for (const b of input.buckets) {
    linesMap.set(b.id, { bucketName: b.name, amountCents: 0, reasonings: [] });
    runningBalances.set(b.id, toCents(b.currentBalance));
  }

  // Pre-allocation contribution split
  const totalIncomeCents = toCents(Math.max(0, input.incomeAmount || 0));
  const hasPrivateEnvelopes = input.buckets.some(
    (b) => b.isPrivate && (!input.incomeUserId || b.userId === input.incomeUserId)
  );

  let sharedCents = totalIncomeCents;
  if (hasPrivateEnvelopes && input.contributionMode && input.contributionMode !== "FULL") {
    if (input.contributionMode === "FIXED_AMOUNT") {
      const fixedVal = typeof input.contributionValue === "string" ? parseFloat(input.contributionValue) : (input.contributionValue ?? 0);
      const fixedCents = toCents(Math.max(0, fixedVal || 0));
      // Guardrail: contribution to shared cannot exceed actual income
      sharedCents = Math.min(totalIncomeCents, fixedCents);
    } else if (input.contributionMode === "PERCENTAGE") {
      const rawPct = typeof input.contributionValue === "string" ? parseFloat(input.contributionValue) : (input.contributionValue ?? 100);
      const pct = Math.min(100, Math.max(0, isNaN(rawPct) ? 100 : rawPct));
      sharedCents = Math.round(totalIncomeCents * (pct / 100));
    }
  }
  const privateCents = totalIncomeCents - sharedCents;

  const defaultSteps: AllocationStrategyStepItem[] = [
    { stepType: "IMMEDIATE_BILLS" },
    { stepType: "EVERYDAY_ALLOWANCE" },
    { stepType: "PRIORITY_BILLS" },
    { stepType: "PRIORITY_GOALS" },
    { stepType: "STANDARD_BILLS" },
    { stepType: "STANDARD_GOALS" },
    { stepType: "SURPLUS_SWEEP" },
  ];

  const sharedSteps = input.strategySteps && input.strategySteps.length > 0 ? input.strategySteps : defaultSteps;

  const executePipeline = (
    availableCents: number,
    targetBuckets: EngineBucket[],
    isPrivateScope: boolean,
    stepsToRun: AllocationStrategyStepItem[]
  ) => {
    const isBucketEligible = (b: EngineBucket) => {
      if (isPrivateScope) {
        if (!b.isPrivate) return false;
        if (input.incomeUserId && b.userId && b.userId !== input.incomeUserId) return false;
        return true;
      }
      return !b.isPrivate;
    };

    const ctx: StepContext = {
      remainingCents: availableCents,
      linesMap,
      runningBalances,
      priorBillAllocated: new Map(),
      currencySymbol: input.currencySymbol || "$",
      cycleFactor,
      regularCycleDays,
      bufferDays,
      bufferedCutoffDateStr,
      isIrregular,
      isBucketEligible,
    };

    for (const step of stepsToRun) {
      if (ctx.remainingCents <= 0 && step.stepType !== "SURPLUS_SWEEP") continue;

      const billBuckets = targetBuckets.filter(isBillsBucket);
      const everydayBuckets = targetBuckets.filter(isEverydayBucket);
      const goalBuckets = targetBuckets.filter(isGoalBucket);

      switch (step.stepType) {
        case "IMMEDIATE_BILLS":
          runStep1ImmediateBills(ctx, billBuckets, envImmediateExpensesMap);
          break;
        case "DEFICIT_REPAIR":
          runStep2DeficitRepair(ctx, targetBuckets);
          break;
        case "BILLS_SAFETY_FLOOR":
          runStep3BillsSafetyFloor(ctx, billBuckets);
          break;
        case "EVERYDAY_ALLOWANCE":
          runStep4EverydayAllowance(ctx, everydayBuckets);
          break;
        case "PRIORITY_BILLS": {
          const priorityBills = billBuckets.filter((b) => b.isPriority);
          runStep5ProRataBills(ctx, priorityBills, futureExpenses, input.paycheckDate);
          break;
        }
        case "STANDARD_BILLS": {
          const standardBills = billBuckets.filter((b) => !b.isPriority);
          runStep5ProRataBills(ctx, standardBills, futureExpenses, input.paycheckDate);
          break;
        }
        case "PRO_RATA_BILLS": {
          const priorityBills = billBuckets.filter((b) => b.isPriority);
          const standardBills = billBuckets.filter((b) => !b.isPriority);
          runStep5ProRataBills(ctx, priorityBills, futureExpenses, input.paycheckDate);
          runStep5ProRataBills(ctx, standardBills, futureExpenses, input.paycheckDate);
          break;
        }
        case "PRIORITY_GOALS": {
          const priorityGoals = goalBuckets.filter((b) => b.isPriority);
          runStep6Goals(ctx, priorityGoals, input.paycheckDate, baseNextCutoffTime);
          break;
        }
        case "STANDARD_GOALS": {
          const standardGoals = goalBuckets.filter((b) => !b.isPriority && !b.isSurplusTarget);
          runStep6Goals(ctx, standardGoals, input.paycheckDate, baseNextCutoffTime);
          break;
        }
        case "FIXED_AMOUNT": {
          const amt = typeof step.config?.amount === "number" ? step.config.amount : parseFloat(String(step.config?.amount || "0"));
          runStepFixedAmount(ctx, targetBuckets, step.targetEnvelopeId, amt);
          break;
        }
        case "PERCENTAGE_SPLIT": {
          const pct = typeof step.config?.percentage === "number" ? step.config.percentage : parseFloat(String(step.config?.percentage || "0"));
          runStepPercentageSplit(ctx, targetBuckets, step.targetEnvelopeId, pct);
          break;
        }
        case "SURPLUS_SWEEP":
          runStep7SurplusSweep(ctx, targetBuckets, step.targetEnvelopeId);
          break;
      }
    }
    return ctx.remainingCents;
  };

  // 1. Run Shared Allocation
  const sharedBuckets = input.buckets.filter((b) => !b.isPrivate);
  const leftoverSharedCents = sharedCents > 0 || totalIncomeCents === 0
    ? executePipeline(sharedCents, sharedBuckets, false, sharedSteps)
    : 0;

  // 2. Run Personal Allocation Strategy (if provided), else route 100% of privateCents to earner's Private Everyday envelope
  if (privateCents > 0 && hasPrivateEnvelopes) {
    const earnerPrivateBuckets = input.buckets.filter(
      (b) => b.isPrivate && (!input.incomeUserId || b.userId === input.incomeUserId)
    );
    if (input.personalStrategySteps && input.personalStrategySteps.length > 0) {
      const leftoverPrivateCents = executePipeline(privateCents, earnerPrivateBuckets, true, input.personalStrategySteps);
      if (leftoverPrivateCents > 0) {
        const fallbackTarget =
          earnerPrivateBuckets.find((b) => b.isSurplusTarget) ??
          earnerPrivateBuckets.find((b) => isEverydayBucket(b)) ??
          earnerPrivateBuckets.find((b) => isGoalBucket(b)) ??
          earnerPrivateBuckets[0];
        if (fallbackTarget) {
          const sym = input.currencySymbol || "$";
          const line = linesMap.get(fallbackTarget.id)!;
          line.amountCents += leftoverPrivateCents;
          line.sweptCents = (line.sweptCents ?? 0) + leftoverPrivateCents;
          line.reasonings.push(
            t("payday.engineReasoning.surplusSweep", {
              allocated: `${sym}${toDollars(leftoverPrivateCents).toFixed(2)}`,
              name: fallbackTarget.name,
            })
          );
          runningBalances.set(fallbackTarget.id, (runningBalances.get(fallbackTarget.id) ?? 0) + leftoverPrivateCents);
        }
      }
    } else {
      const privateTarget =
        earnerPrivateBuckets.find((b) => isEverydayBucket(b)) ?? earnerPrivateBuckets[0];

      if (privateTarget) {
        const sym = input.currencySymbol || "$";
        const line = linesMap.get(privateTarget.id)!;
        line.amountCents += privateCents;
        line.reasonings.push(
          t("payday.engineReasoning.personalSingleEnvelope", {
            allocated: `${sym}${toDollars(privateCents).toFixed(2)}`,
            name: privateTarget.name,
          })
        );
        const curBal = runningBalances.get(privateTarget.id) ?? 0;
        runningBalances.set(privateTarget.id, curBal + privateCents);
      }
    }
  }

  const lines: AllocationLine[] = Array.from(linesMap.entries()).map(([bucketId, data]) => ({
    bucketId,
    bucketName: data.bucketName,
    proposedAmount: toDollars(data.amountCents),
    ...(data.sweptCents && data.sweptCents > 0 ? { sweptAmount: toDollars(data.sweptCents) } : {}),
    reasoning: data.reasonings.length > 0 ? data.reasonings.join(" ") : "",
  }));

  const isInsufficient = lines.some((l) => {
    const bucket = input.buckets.find((b) => b.id === l.bucketId);
    if (!bucket || (!bucket.isPriority && !isBillsBucket(bucket))) return false;
    if (bucket.isPrivate) {
      if (privateCents <= 0 && totalIncomeCents > 0) return false;
      if (input.incomeUserId && bucket.userId && bucket.userId !== input.incomeUserId) return false;
    } else {
      if (sharedCents <= 0 && totalIncomeCents > 0) return false;
    }
    if (bucket.envelopeType === "GOAL" && bucket.targetAmount) {
      const targetCents = toCents(bucket.targetAmount);
      const balanceCents = toCents(bucket.currentBalance ?? 0);
      if (targetCents > 0 && balanceCents >= targetCents) return false;
    }
    const monthlyTarget = toCents(bucket.monthlyAmount ?? bucket.targetAmount ?? 0);
    return l.proposedAmount === 0 && monthlyTarget > 0;
  });

  return {
    status: isInsufficient ? "INSUFFICIENT" : "OK",
    lines,
    unallocatedAmount: toDollars(leftoverSharedCents),
  };
}
