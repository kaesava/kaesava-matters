import { z } from "zod";

const SpendingTimeframeEnum = z.enum(["30D", "90D", "1Y"]);
export type SpendingTimeframe = z.infer<typeof SpendingTimeframeEnum>;

const SpendingFlowTypeEnum = z.enum(["ALL", "DEBIT", "CREDIT", "TRANSFER"]);
export type SpendingFlowType = z.infer<typeof SpendingFlowTypeEnum>;

export const GetSpendingAnalyticsQuery = z.object({
  timeframe: SpendingTimeframeEnum.default("90D"),
  envelopeId: z.string().optional(),
  bankAccountId: z.string().optional(),
  searchQuery: z.string().optional(),
  flowType: SpendingFlowTypeEnum.default("ALL"),
}).strict();
export type GetSpendingAnalyticsQuery = z.infer<typeof GetSpendingAnalyticsQuery>;

export const GetPaydayPlanAnalyticsQuerySchema = z.object({
  timeframe: SpendingTimeframeEnum.default("90D"),
  bankAccountId: z.string().optional(),
  searchQuery: z.string().optional(),
  envelopeId: z.string().optional(),
}).strict();

export interface HorizonBreakdownDTO {
  everyday: number;
  bills: number;
  goals: number;
  totalOutflow: number;
  percentages: {
    everyday: number;
    bills: number;
    goals: number;
  };
}

export interface MonthlyCashFlowPointDTO {
  monthKey: string;
  label: string;
  income: number;
  outflow: number;
  net: number;
}

export interface TopOutflowPoolDTO {
  id: string;
  name: string;
  amount: number;
  percentage: number;
}

export interface TopPayeeItemDTO {
  name: string;
  amount: number;
  percentage: number;
}

export interface SpendingAnalyticsDTO {
  timeframe: SpendingTimeframe;
  totalOutflow: number;
  totalIncome: number;
  horizonBreakdown: HorizonBreakdownDTO;
  monthlyCashFlow: MonthlyCashFlowPointDTO[];
  topPools: TopOutflowPoolDTO[];
  otherPoolsAmount: number;
  isEmpty: boolean;
  // Filter-aware adaptive fields
  isFiltered: boolean;
  filteredEnvelopeName?: string;
  filteredSharePercentage: number;
  topPayees: TopPayeeItemDTO[];
  isTransferOnly: boolean;
}

export type PaydayPlanAnalyticsDTO = SpendingAnalyticsDTO;
