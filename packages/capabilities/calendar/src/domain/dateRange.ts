import type { DateRangeResult } from "./types";

const MS_PER_DAY = 86_400_000;

/** Parses a YYYY-MM-DD string into a UTC midnight Date. */
export function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** Formats a Date into YYYY-MM-DD using UTC components. */
export function toIsoDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds a signed number of days to a YYYY-MM-DD string. */
export function addDays(isoDate: string, days: number): string {
  const base = parseIsoDate(isoDate).getTime();
  return toIsoDateString(new Date(base + days * MS_PER_DAY));
}

/** Returns the YYYY-MM-DD start of the week containing isoDate. */
export function startOfWeekIso(isoDate: string, weekStartsOn: 0 | 1 = 1): string {
  const day = parseIsoDate(isoDate).getUTCDay();
  const diff = (day - weekStartsOn + 7) % 7;
  return addDays(isoDate, -diff);
}

/** Returns a single-day range descriptor for a YYYY-MM-DD date. */
export function getDayRange(isoDate: string): DateRangeResult {
  return {
    startIso: `${isoDate}T00:00:00.000Z`,
    endIso: `${isoDate}T23:59:59.999Z`,
    dates: [isoDate],
  };
}

/** Returns a 7-day week range descriptor starting on weekStartsOn. */
export function getWeekRange(isoDate: string, weekStartsOn: 0 | 1 = 1): DateRangeResult {
  const startDate = startOfWeekIso(isoDate, weekStartsOn);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  return {
    startIso: `${dates[0]}T00:00:00.000Z`,
    endIso: `${dates[6]}T23:59:59.999Z`,
    dates,
  };
}

/** Formats minutes since midnight as HH:MM. */
export function formatHourLabel(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = String(Math.floor(clamped / 60)).padStart(2, "0");
  const m = String(clamped % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** Extracts minutes since midnight from an ISO datetime or HH:MM string. */
export function extractTimeMinutes(isoOrTime: string): number {
  const timeMatch = isoOrTime.match(/T?(\d{2}):(\d{2})/);
  if (!timeMatch) return 0;
  return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
}

/** Formats a start/end ISO pair as HH:MM - HH:MM. */
export function formatTimeRangeLabel(startIso: string, endIso: string): string {
  return `${formatHourLabel(extractTimeMinutes(startIso))} - ${formatHourLabel(extractTimeMinutes(endIso))}`;
}
