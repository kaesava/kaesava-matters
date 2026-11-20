import { t } from "@money-matters/i18n";

export type LandingPresetKey = "BALANCED" | "BILLS_FORTRESS" | "PAY_YOURSELF_FIRST";
export type LandingCadence = "weekly" | "fortnightly" | "monthly";
export type LandingAffordMode = "ONE_OFF" | "RECURRING";
export type LandingAffordFrequency = "WEEKLY" | "FORTNIGHTLY" | "MONTHLY" | "ANNUALLY";
export type LandingCardStatus = "FUNDED" | "PARTIAL" | "GAP";

export type LandingAffordVerdictStatus =
  | "SAFE_YES"
  | "PACING_TIGHT"
  | "BILLS_RISK"
  | "WAIT_FOR_PAYCYCLE"
  | "GOAL_DELAYED"
  | "HARD_NO";

export interface LandingAffordVerdict {
  status: LandingAffordVerdictStatus;
  title: string;
  desc: string;
}

export interface LandingEnvelopeAllocation {
  amount: number;
  target: number;
  status: LandingCardStatus;
}

export interface LandingPaydaySplit {
  bills: LandingEnvelopeAllocation;
  everyday: LandingEnvelopeAllocation;
  goals: LandingEnvelopeAllocation;
  surplus: number;
}

function getCardStatus(amount: number, target: number): LandingCardStatus {
  if (amount >= target) return "FUNDED";
  if (amount > 0) return "PARTIAL";
  return "GAP";
}

/**
 * Allocates netIncome in the active preset's priority order against
 * cadence-scaled household targets so moving the slider transitions cards
 * from funding gaps to partially funded to fully funded.
 */
export function computeLandingPaydaySplit(
  netIncome: number,
  cadence: LandingCadence,
  preset: LandingPresetKey
): LandingPaydaySplit {
  const scale = cadence === "weekly" ? 0.5 : cadence === "monthly" ? 2.15 : 1;
  const billsTarget = Math.round(1400 * scale);
  const everydayTarget = Math.round(700 * scale);
  const goalsTarget = Math.round(500 * scale);

  let remaining = Math.max(0, netIncome);
  let bills = 0;
  let everyday = 0;
  let goals = 0;

  const take = (need: number) => {
    const alloc = Math.min(remaining, need);
    remaining -= alloc;
    return alloc;
  };

  if (preset === "BILLS_FORTRESS") {
    bills = take(billsTarget);
    everyday = take(everydayTarget);
    goals = take(goalsTarget);
  } else if (preset === "PAY_YOURSELF_FIRST") {
    const immediateBills = Math.round(billsTarget * 0.5);
    bills = take(immediateBills);
    goals = take(goalsTarget);
    everyday = take(everydayTarget);
    bills += take(billsTarget - immediateBills);
  } else {
    const immediateBills = Math.round(billsTarget * 0.6);
    bills = take(immediateBills);
    everyday = take(everydayTarget);
    bills += take(billsTarget - immediateBills);
    goals = take(goalsTarget);
  }

  return {
    bills: { amount: bills, target: billsTarget, status: getCardStatus(bills, billsTarget) },
    everyday: { amount: everyday, target: everydayTarget, status: getCardStatus(everyday, everydayTarget) },
    goals: { amount: goals, target: goalsTarget, status: getCardStatus(goals, goalsTarget) },
    surplus: Math.max(0, remaining),
  };
}

function toMonthlyEquivalent(amount: number, frequency: LandingAffordFrequency): number {
  switch (frequency) {
    case "WEEKLY":
      return (amount * 52) / 12;
    case "FORTNIGHTLY":
      return (amount * 26) / 12;
    case "ANNUALLY":
      return amount / 12;
    case "MONTHLY":
    default:
      return amount;
  }
}

/**
 * Mirrors the 6 real verdicts of Money Matters' "Can I Afford It?" engine
 * for both One-Off purchases and Recurring commitments.
 */
export function computeLandingAffordVerdict(params: {
  amount: number;
  mode: LandingAffordMode;
  frequency: LandingAffordFrequency;
  netIncome: number;
  everydayTarget: number;
  goalsTarget: number;
}): LandingAffordVerdict {
  const { amount, mode, frequency, netIncome, everydayTarget, goalsTarget } = params;

  if (mode === "RECURRING") {
    const monthlyImpact = toMonthlyEquivalent(amount, frequency);
    const monthlyHeadroom = everydayTarget * 2 + goalsTarget * 2;
    if (monthlyImpact <= everydayTarget * 0.35) {
      return {
        status: "SAFE_YES",
        title: t("landing.affordVerdictSafeTitle"),
        desc: t("landing.affordVerdictSafeDesc"),
      };
    }
    if (monthlyImpact <= everydayTarget * 0.65) {
      return {
        status: "PACING_TIGHT",
        title: t("landing.affordVerdictPacingTitle"),
        desc: t("landing.affordVerdictPacingDesc"),
      };
    }
    if (monthlyImpact <= monthlyHeadroom) {
      return {
        status: "GOAL_DELAYED",
        title: t("landing.affordVerdictGoalTitle"),
        desc: t("landing.affordVerdictGoalDesc"),
      };
    }
    return {
      status: "HARD_NO",
      title: t("landing.affordVerdictNoTitle"),
      desc: t("landing.affordVerdictNoDesc"),
    };
  }

  if (amount <= everydayTarget * 0.4) {
    return {
      status: "SAFE_YES",
      title: t("landing.affordVerdictSafeTitle"),
      desc: t("landing.affordVerdictSafeDesc"),
    };
  }
  if (amount <= everydayTarget * 0.75) {
    return {
      status: "PACING_TIGHT",
      title: t("landing.affordVerdictPacingTitle"),
      desc: t("landing.affordVerdictPacingDesc"),
    };
  }
  if (amount <= everydayTarget * 1.15) {
    return {
      status: "BILLS_RISK",
      title: t("landing.affordVerdictBillsRiskTitle"),
      desc: t("landing.affordVerdictBillsRiskDesc"),
    };
  }
  if (amount <= netIncome) {
    return {
      status: "WAIT_FOR_PAYCYCLE",
      title: t("landing.affordVerdictWaitTitle"),
      desc: t("landing.affordVerdictWaitDesc"),
    };
  }
  return {
    status: "HARD_NO",
    title: t("landing.affordVerdictNoTitle"),
    desc: t("landing.affordVerdictNoDesc"),
  };
}
