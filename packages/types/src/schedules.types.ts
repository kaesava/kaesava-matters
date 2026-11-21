/**
 * Outlook-ready recurring series & occurrence bursting contracts.
 * Reusable across financial schedules, recurring tasks, and visual calendars.
 */

export type ScheduleEditScope =
  | "SINGLE_OCCURRENCE"
  | "THIS_AND_FOLLOWING"
  | "ENTIRE_SERIES";

export type ScheduleOccurrenceStatus =
  | "PENDING"
  | "CONFIRMED"
  | "SKIPPED"
  | "CANCELLED";

export interface ScheduleSeriesDefinition {
  id: string;
  tenantId: string;
  appId: string;
  name: string;
  rrule: string | null;
  startDate: string | null;
  endDate: string | null;
  startTime?: string | null;
  durationMinutes?: number | null;
  lastBurstDate: string | null;
}

export interface ScheduleOccurrenceRecord {
  id: string;
  seriesId: string | null;
  expectedDate: string;
  actualDate?: string | null;
  startTime?: string | null;
  durationMinutes?: number | null;
  status: ScheduleOccurrenceStatus;
  isException?: boolean;
}

export interface BurstWindowInput {
  rrule: string;
  startDate: string;
  endDate?: string | null;
  fromDate: string;
  horizonMonths?: number;
  timezone: string;
}

export interface SeriesEditPlan {
  scope: ScheduleEditScope;
  keepOccurrenceDates: string[];
  purgePendingFromDate: string | null;
  truncateSeriesEndDate: string | null;
  newSeriesStartDate: string | null;
  newOccurrenceDates: string[];
}
