import type { EstimatedCategoryItem, QuizAnswers, UserGoalItem } from "./onboarding-quiz.js";
import { calculateQuizEstimates } from "./onboarding-quiz-estimates.js";

export function getTotalSetupSteps(isRerun: boolean): number {
  return isRerun ? 3 : 5;
}

export type SetupFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "ANNUALLY";

/** Converts a periodic amount in the given frequency to a rounded monthly equivalent. */
export function convertToMonthly(val: number, freq: SetupFrequency): number {
  if (freq === "WEEKLY") return Math.round((val * 52) / 12);
  if (freq === "FORTNIGHTLY") return Math.round((val * 26) / 12);
  if (freq === "QUARTERLY") return Math.round((val * 4) / 12);
  if (freq === "YEARLY" || freq === "ANNUALLY") return Math.round(val / 12);
  return Math.round(val);
}

/** Converts a monthly amount into the equivalent periodic amount for display/input. */
export function convertFromMonthly(monthlyVal: number, freq: SetupFrequency): number {
  if (freq === "WEEKLY") return Math.round((monthlyVal * 12) / 52);
  if (freq === "FORTNIGHTLY") return Math.round((monthlyVal * 12) / 26);
  if (freq === "QUARTERLY") return Math.round((monthlyVal * 12) / 4);
  if (freq === "YEARLY" || freq === "ANNUALLY") return Math.round(monthlyVal * 12);
  return Math.round(monthlyVal);
}

/** Returns the number of months remaining until a goal's target date (minimum 1, default 12). */
export function getGoalMonthsDiff(targetDateStr?: string | null): number {
  if (!targetDateStr) return 12;
  const now = new Date();
  const target = new Date(targetDateStr);
  const months =
    (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.max(1, months);
}

export interface GoalPresetConfig {
  name: string;
  nameKey: string;
  fundingMode: "TARGET_BALANCE" | "RECURRING";
  icon: string;
  defaultTarget: number;
  defaultMonths?: number;
}

export const PRESET_GOALS: GoalPresetConfig[] = [
  { name: "Annual Holiday", nameKey: "setup.goals.presetHoliday", fundingMode: "TARGET_BALANCE", icon: "plane", defaultTarget: 5000, defaultMonths: 12 },
  { name: "Car / Vehicle", nameKey: "setup.goals.presetVehicle", fundingMode: "TARGET_BALANCE", icon: "car", defaultTarget: 15000, defaultMonths: 24 },
  { name: "Tech Upgrade", nameKey: "setup.goals.presetTech", fundingMode: "TARGET_BALANCE", icon: "laptop", defaultTarget: 1500, defaultMonths: 6 },
  { name: "Emergency Reserve", nameKey: "setup.goals.presetEmergency", fundingMode: "RECURRING", icon: "shield", defaultTarget: 300 },
  { name: "Education Fund", nameKey: "setup.goals.presetEducation", fundingMode: "RECURRING", icon: "book", defaultTarget: 200 },
  { name: "Wealth Building", nameKey: "setup.goals.presetWealth", fundingMode: "RECURRING", icon: "trending-up", defaultTarget: 400 },
];

export interface SetupWizardCalculationsInput {
  quizAnswers: QuizAnswers;
  isRerun: boolean;
  goals?: UserGoalItem[];
  customCategories: EstimatedCategoryItem[];
  removedCategoryNames: Set<string>;
  amountOverrides: Record<string, number>;
  billTypeOverrides?: Record<string, "RECURRING" | "TARGET_BALANCE">;
}

function mapGoalToEstimatedCategory(
  g: UserGoalItem,
  amountOverrides: Record<string, number>
): EstimatedCategoryItem {
  const isOngoing = g.fundingMode === "RECURRING" || (!g.dueDate && Boolean(g.budgetFrequency));
  const override = amountOverrides[g.name];
  const rawAmt =
    g.enteredAmount !== undefined && g.enteredAmount !== null
      ? g.enteredAmount
      : (g.monthlyAmount || g.targetAmount || 0);
  const baseMonthly = isOngoing
    ? convertToMonthly(rawAmt, (g.budgetFrequency || "MONTHLY") as SetupFrequency)
    : Math.round((g.targetAmount || 0) / getGoalMonthsDiff(g.dueDate));

  return {
    id: g.id,
    name: g.name,
    type: "GOAL",
    envelopeType: "GOAL",
    fundingMode: isOngoing ? "RECURRING" : "TARGET_BALANCE",
    isPriority: g.isPriority ?? true,
    isSurplusTarget: g.isSurplusTarget ?? false,
    isPrivate: g.isPrivate ?? false,
    bankAccountId: g.bankAccountId,
    targetAmount: g.targetAmount ?? null,
    enteredAmount: g.enteredAmount ?? null,
    endDate: g.dueDate ?? null,
    budgetFrequency: g.budgetFrequency ?? null,
    startDate: g.startDate ?? null,
    rrule: g.rrule ?? null,
    currentBalance: g.currentBalance ?? 0,
    monthlyAud: override !== undefined ? override : baseMonthly,
    icon: g.icon || "target",
  };
}

export function computeSetupWizardCalculations(input: SetupWizardCalculationsInput) {
  const estimation = calculateQuizEstimates(input.quizAnswers);
  const activeGoals = (input.goals || [])
    .filter((g) => !input.removedCategoryNames.has(g.name))
    .map((g) => mapGoalToEstimatedCategory(g, input.amountOverrides));

  const customNonGoals = input.customCategories.filter((c) => c.type !== "GOAL");
  const hasCustomNamed = (name: string) =>
    customNonGoals.some((c) => c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const nonGoalCategories = input.isRerun
    ? customNonGoals
    : [
        ...estimation.regularBills.filter((b) => !hasCustomNamed(b.name)),
        ...estimation.everydayCategories.filter((e) => !hasCustomNamed(e.name)),
        ...customNonGoals,
      ];

  const billTypeOverrides = input.billTypeOverrides || {};
  const mappedNonGoals = nonGoalCategories
    .filter((cat) => !input.removedCategoryNames.has(cat.name))
    .map((cat) => {
      const override = input.amountOverrides[cat.name];
      const isEveryday = cat.type === "EVERYDAY";
      return {
        ...cat,
        envelopeType: isEveryday ? ("EVERYDAY" as const) : ("BILL" as const),
        fundingMode: billTypeOverrides[cat.name] || cat.fundingMode || (isEveryday ? "TARGET_BALANCE" : "RECURRING"),
        monthlyAud: override !== undefined ? override : cat.monthlyAud,
      };
    });

  const activeCategories = [...mappedNonGoals, ...activeGoals];
  const activeEveryday = activeCategories.filter((c) => c.type === "EVERYDAY");
  const activeRegular = activeCategories.filter((c) => c.type === "BILL");
  const totalEverydayMonthly = activeEveryday.reduce((acc, c) => acc + c.monthlyAud, 0);
  const totalRegularMonthly = activeRegular.reduce((acc, c) => acc + c.monthlyAud, 0);
  const totalGoalMonthly = activeGoals.reduce((acc, c) => acc + c.monthlyAud, 0);

  return {
    estimation,
    activeCategories,
    activeEveryday,
    activeRegular,
    activeGoals,
    totalEverydayMonthly,
    totalRegularMonthly,
    totalGoalMonthly,
    totalAllocatedMonthly: totalEverydayMonthly + totalRegularMonthly + totalGoalMonthly,
    convertToMonthly,
    convertFromMonthly,
  };
}
