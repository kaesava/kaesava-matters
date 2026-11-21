import type {
  BurstWindowInput,
  ScheduleEditScope,
  ScheduleOccurrenceRecord,
  ScheduleSeriesDefinition,
  SeriesEditPlan,
} from "@money-matters/types";

interface ParsedRule {
  freq: "WEEKLY" | "MONTHLY" | "YEARLY";
  interval: number;
}

function parseRule(rrule: string): ParsedRule {
  const upper = rrule.toUpperCase();
  const intervalMatch = upper.match(/INTERVAL=(\d+)/);
  const interval = Math.max(1, intervalMatch ? parseInt(intervalMatch[1], 10) : 1);
  if (upper.includes("FREQ=WEEKLY")) return { freq: "WEEKLY", interval };
  if (upper.includes("FREQ=YEARLY") || upper.includes("FREQ=ANNUALLY")) {
    return { freq: "YEARLY", interval };
  }
  return { freq: "MONTHLY", interval };
}

function toIsoDate(year: number, month: number, day: number): string {
  const y = String(year).padStart(4, "0");
  const m = String(month).padStart(2, "0");
  const d = String(day).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function addMonthsClamped(iso: string, months: number, anchorDay: number): string {
  const [y, m] = iso.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + months;
  const nextYear = Math.floor(totalMonths / 12);
  const nextMonth = (totalMonths % 12) + 1;
  const nextDay = Math.min(anchorDay, daysInMonth(nextYear, nextMonth));
  return toIsoDate(nextYear, nextMonth, nextDay);
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return toIsoDate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function stepDate(current: string, rule: ParsedRule, anchorDay: number): string {
  if (rule.freq === "WEEKLY") return addDaysIso(current, rule.interval * 7);
  if (rule.freq === "YEARLY") return addMonthsClamped(current, rule.interval * 12, anchorDay);
  return addMonthsClamped(current, rule.interval, anchorDay);
}

/**
 * Generates recurring ISO YYYY-MM-DD occurrence dates within [fromDate, horizonEnd]
 * clamped to optional endDate. Timezone-safe and table-agnostic.
 */
export function computeRecurringDates(input: BurstWindowInput): string[] {
  const rule = parseRule(input.rrule);
  const horizonMonths = Math.max(1, input.horizonMonths ?? 12);
  const anchorDay = Number(input.startDate.split("-")[2] || 1);
  const horizonEnd = addMonthsClamped(input.fromDate, horizonMonths, Number(input.fromDate.split("-")[2] || 1));
  const effectiveEnd =
    input.endDate && input.endDate < horizonEnd ? input.endDate : horizonEnd;

  const dates: string[] = [];
  let cursor = input.startDate;
  let guard = 0;

  while (cursor <= effectiveEnd && guard < 400) {
    if (cursor >= input.fromDate) {
      dates.push(cursor);
    }
    cursor = stepDate(cursor, rule, anchorDay);
    guard++;
  }
  return dates;
}

/**
 * Outlook-style series edit scope planner supporting SINGLE_OCCURRENCE,
 * THIS_AND_FOLLOWING (series split), and ENTIRE_SERIES updates.
 */
export function planSeriesEditScope(params: {
  scope: ScheduleEditScope;
  fromDate: string;
  existingSeries: ScheduleSeriesDefinition;
  occurrences: readonly ScheduleOccurrenceRecord[];
  updatedRrule: string;
  updatedStartDate?: string;
  updatedEndDate?: string | null;
  timezone: string;
  horizonMonths?: number;
}): SeriesEditPlan {
  if (params.scope === "SINGLE_OCCURRENCE") {
    return {
      scope: "SINGLE_OCCURRENCE",
      keepOccurrenceDates: params.occurrences.map((o) => o.expectedDate),
      purgePendingFromDate: null,
      truncateSeriesEndDate: null,
      newSeriesStartDate: null,
      newOccurrenceDates: [],
    };
  }

  const startDate = params.updatedStartDate || params.existingSeries.startDate || params.fromDate;
  const effectiveFrom = params.scope === "THIS_AND_FOLLOWING" ? params.fromDate : startDate;
  const keepOccurrenceDates = params.occurrences
    .filter((o) => o.status === "CONFIRMED" || o.expectedDate < effectiveFrom)
    .map((o) => o.expectedDate);

  const newOccurrenceDates = computeRecurringDates({
    rrule: params.updatedRrule,
    startDate: params.scope === "THIS_AND_FOLLOWING" ? params.fromDate : startDate,
    endDate: params.updatedEndDate ?? params.existingSeries.endDate,
    fromDate: effectiveFrom,
    horizonMonths: params.horizonMonths ?? 12,
    timezone: params.timezone,
  });

  return {
    scope: params.scope,
    keepOccurrenceDates,
    purgePendingFromDate: effectiveFrom,
    truncateSeriesEndDate:
      params.scope === "THIS_AND_FOLLOWING" ? addDaysIso(params.fromDate, -1) : null,
    newSeriesStartDate: params.scope === "THIS_AND_FOLLOWING" ? params.fromDate : startDate,
    newOccurrenceDates,
  };
}
