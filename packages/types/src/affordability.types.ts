import { z } from "zod";

/**
 * Sub-type for an upcoming bill item shown in affordability simulation breakdowns.
 */
export interface UpcomingBillItem {
  name: string;
  amount: string;
  dueDate: string;
}

/**
 * Sub-type describing how a goal's target date is impacted by a purchase or recurring commitment.
 */
export interface GoalDelayImpact {
  goalId: string;
  goalName: string;
  isPriority?: boolean;
  originalTargetDate: string | null;
  newTargetDate: string | null;
  delayDays: number;
}

export interface OneOffGoalAlternative {
  goalId: string;
  goalName: string;
  availableGoalBalance: string;
  shortfallCovered: string;
  delayDays: number;
  newTargetDate: string | null;
}

/**
 * Input query schema for the "Can I Afford It?" simulation.
 * Supports one-off purchases and recurring commitments with frequency.
 */
export const CanAffordQuery = z.object({
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/).refine((v) => parseFloat(v) > 0, { message: "Amount must be greater than 0" }),
  mode: z.enum(["ONE_OFF", "RECURRING"]).default("ONE_OFF"),
  frequency: z.enum(["WEEKLY", "FORTNIGHTLY", "MONTHLY", "ANNUALLY"]).optional(),
  includePersonal: z.boolean().default(false).optional(),
  itemName: z.string().max(100).optional(),
  locale: z.string().optional(),
}).strict();

/**
 * Discriminated union DTO defining all affordability simulation outcomes.
 * Produced by the simulation capability's canAffordSimulationQuery.
 */
export type CanAffordVerdictType =
  | {
      verdict: "SAFE_YES";
      availableCash: string;
      effectiveSpendable: string;
      everydayRemaining: string;
      safeCushion: string;
      daysUntilPayday: number;
      nextPaydayDate: string;
      upcomingBillsBeforePayday: string;
      startAdvice?: string;
      rationaleSteps: string[];
    }
  | {
      verdict: "PACING_TIGHT";
      availableCash: string;
      effectiveSpendable: string;
      everydayRemaining: string;
      safeCushion: string;
      cushionShortfall: string;
      daysUntilPayday: number;
      nextPaydayDate: string;
      upcomingBillsBeforePayday: string;
      startAdvice?: string;
      rationaleSteps: string[];
    }
  | {
      verdict: "BILLS_RISK";
      availableCash: string;
      upcomingBillsBeforePayday: string;
      effectiveAfterBills: string;
      billsDueItems: UpcomingBillItem[];
      rationaleSteps: string[];
    }
  | {
      verdict: "WAIT_FOR_PAYCYCLE";
      canAffordAt: string;
      paycyclesAway: number;
      projectedEverydayAtThatDate: string;
      shortfallToday: string;
      goalAlternative?: OneOffGoalAlternative;
      rationaleSteps: string[];
    }
  | {
      verdict: "GOAL_DELAYED";
      isAffordable: boolean;
      goalDelays: GoalDelayImpact[];
      recurringMonthlyImpact: string;
      startAdvice?: string;
      rationaleSteps: string[];
    }
  | {
      verdict: "HARD_NO";
      shortfall: string;
      horizonMonths: number;
      rationaleSteps: string[];
    };

/**
 * Bill coverage item and overall result types.
 */
export interface BillCoverageItem {
  envelopeId: string;
  envelopeName: string;
  monthlyAmount: string | null;
  nextDueDate: string | null;
  nextDueAmount: string | null;
  coverageStatus: "COVERED" | "SHORT_BY" | "NO_SCHEDULE";
  shortfallAmount: string | null;
}

export interface BillCoverageResult {
  billsPoolBalance: number;
  totalUpcomingBeforePayday: number;
  nextPaydayDate: string | null;
  items: BillCoverageItem[];
}
