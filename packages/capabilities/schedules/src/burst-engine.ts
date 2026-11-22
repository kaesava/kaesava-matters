export interface ComputeRecurringDatesInput {
  rrule: string;
  startDate: string;
  fromDate: string;
  endDate?: string | null;
  horizonMonths?: number;
  timezone?: string;
}

export function computeRecurringDates({
  rrule,
  startDate,
  fromDate,
  endDate,
  horizonMonths = 12,
}: ComputeRecurringDatesInput): string[] {
  const parts = Object.fromEntries(
    rrule.split(";").map((p) => p.split("=") as [string, string])
  );
  const freq = parts["FREQ"] ?? "MONTHLY";
  const interval = Math.max(1, Number(parts["INTERVAL"] ?? "1"));

  const start = new Date(`${startDate}T12:00:00Z`);
  const from = new Date(`${fromDate}T12:00:00Z`);
  const horizonEnd = new Date(from);
  horizonEnd.setUTCMonth(horizonEnd.getUTCMonth() + horizonMonths);
  const hardEnd = endDate ? new Date(`${endDate}T12:00:00Z`) : horizonEnd;
  const limit = hardEnd < horizonEnd ? hardEnd : horizonEnd;

  const dates: string[] = [];
  const cursor = new Date(start);
  let guard = 0;
  while (cursor <= limit && guard < 500) {
    guard++;
    if (cursor >= from) {
      dates.push(cursor.toISOString().slice(0, 10));
    }
    if (freq === "WEEKLY") {
      cursor.setUTCDate(cursor.getUTCDate() + 7 * interval);
    } else if (freq === "YEARLY") {
      cursor.setUTCFullYear(cursor.getUTCFullYear() + interval);
    } else {
      cursor.setUTCMonth(cursor.getUTCMonth() + interval);
    }
  }
  return dates;
}

export interface PlanSeriesEditScopeInput {
  scope: "SINGLE_OCCURRENCE" | "THIS_AND_FOLLOWING" | "ENTIRE_SERIES";
  fromDate: string;
  existingSeries: {
    id: string;
    tenantId: string;
    appId: string;
    name: string;
    rrule: string | null;
    startDate: string | null;
    endDate: string | null;
    lastBurstDate: string | null;
  };
  occurrences: Array<{ id: string; seriesId: string | null; expectedDate: string; status: string }>;
  updatedRrule: string;
  timezone?: string;
  horizonMonths?: number;
}

export function planSeriesEditScope(input: PlanSeriesEditScopeInput) {
  const from = new Date(`${input.fromDate}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 1);
  const truncateSeriesEndDate = from.toISOString().slice(0, 10);
  const keepOccurrenceDates = input.occurrences
    .filter((o) => o.expectedDate < input.fromDate || o.status === "CONFIRMED")
    .map((o) => o.expectedDate);
  const cancelOccurrenceIds = input.occurrences
    .filter((o) => o.status === "PENDING" && o.expectedDate >= input.fromDate)
    .map((o) => o.id);
  const newOccurrenceDates = computeRecurringDates({
    rrule: input.updatedRrule,
    startDate: input.fromDate,
    fromDate: input.fromDate,
    endDate: input.existingSeries.endDate,
    horizonMonths: input.horizonMonths ?? 12,
    timezone: input.timezone,
  });
  return { scope: input.scope, newSeriesStartDate: input.fromDate, truncateSeriesEndDate, purgePendingFromDate: input.fromDate, keepOccurrenceDates, cancelOccurrenceIds, newOccurrenceDates };
}
