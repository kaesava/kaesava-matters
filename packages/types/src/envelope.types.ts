export type EnvelopeHealthStatus = "GREEN" | "AMBER" | "RED";

export type FundingMode = "TARGET_BALANCE" | "RECURRING";

export type EnvelopeType = "EVERYDAY" | "BILL" | "GOAL";


export interface EnvelopeListItemDto {
  id: string;
  name: string;
  envelopeType: EnvelopeType;
  fundingMode?: FundingMode | null;
  bankAccountId: string | null;
  bankAccountName: string | null;
  safetyBufferFloor: string | null;
  monthlyAmount: string | null;
  enteredAmount: string | null;
  budgetFrequency: string | null;
  startDate: string | null;
  endDate: string | null;
  rrule: string | null;
  targetAmount: string | null;
  isPriority: boolean;
  isSurplusTarget: boolean;
  isPrivate: boolean;
  userId: string | null;
  orderIndex: number;
  createdAt: Date | string;
  currentBalance: number;
  healthStatus: EnvelopeHealthStatus;
  progressPercentage: number;
  hasScheduledEvents: boolean;
  generateEvents: boolean;
}

export interface TargetCelebrationItem {
  id: string;
  name: string;
  type: "GOAL_TARGET_MET" | "RECURRING_GOAL_FUNDED" | "BILLS_COVERED" | "SURPLUS_SWEPT";
  amount: number;
  targetAmount?: number;
}
