import { z } from "zod";

/**
 * Generic Ring 1 Chart DTOs (zero app-specific domain nouns).
 */
export interface RankedBarItemDTO {
  id: string;
  label: string;
  amount: number;
  color?: string;
}

export interface TrendBarPointDTO {
  label: string;
  primaryValue: number;
  secondaryValue?: number;
}

export interface DonutSliceDTO {
  id: string;
  label: string;
  value: number;
  color: string;
}

/**
 * Generic Ring 1 Command Palette DTOs.
 */
export interface CommandPaletteEntityItemDTO {
  id: string;
  label: string;
  sublabel?: string;
  href?: string;
  onSelect?: () => void;
  keywords?: string[];
}

export interface CommandPaletteEntityGroupDTO {
  id: string;
  title: string;
  items: CommandPaletteEntityItemDTO[];
}

export interface CommandPaletteActionDTO {
  id: string;
  label: string;
  shortcut?: string;
  href?: string;
  onSelect: () => void;
}

export interface CommandPaletteAssistantConfig {
  name: string;
  placeholder: string;
  leadWordsRegex: RegExp;
  onAsk: (query: string) => void;
}

/**
 * Generic Ring 1 / Ring 2 Schedule DTOs.
 */
export const ScheduleFrequencyEnum = z.enum([
  "WEEKLY",
  "FORTNIGHTLY",
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencyEnum>;

export const ScheduleEditScopeEnum = z.enum([
  "SINGLE_OCCURRENCE",
  "THIS_AND_FOLLOWING",
  "ENTIRE_SERIES",
]);
export type ScheduleEditScope = z.infer<typeof ScheduleEditScopeEnum>;

export const ScheduleSeriesConfigSchema = z
  .object({
    frequency: ScheduleFrequencyEnum,
    interval: z.number().int().min(1).default(1),
    startDate: z.string(),
    endDate: z.string().nullable().optional(),
    horizonMonths: z.number().int().min(1).max(36).default(12),
    timezone: z.string().default("UTC"),
    rrule: z.string().optional(),
  })
  .strict();
export type ScheduleSeriesConfigDTO = z.infer<typeof ScheduleSeriesConfigSchema>;

export interface ScheduleOccurrenceDTO {
  id: string;
  seriesId: string;
  expectedDate: string;
  expectedAmount: string;
  status: string;
  note?: string | null;
}

export const ScheduleOverrideInputSchema = z
  .object({
    occurrenceId: z.string().uuid(),
    expectedDate: z.string().optional(),
    expectedAmount: z.string().optional(),
    note: z.string().nullable().optional(),
    scope: ScheduleEditScopeEnum.default("SINGLE_OCCURRENCE"),
  })
  .strict();
export type ScheduleOverrideInput = z.infer<typeof ScheduleOverrideInputSchema>;
