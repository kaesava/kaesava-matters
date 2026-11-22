/**
 * Timezone and Calendar Utilities for scheduled notification crons and date deltas.
 */

import { getCachedDateFormat } from "@money-matters/types";

export function todayInZone(timeZone: string = "UTC", now: Date = new Date()): string {
  return getCachedDateFormat("en-CA", { timeZone }).format(now);
}

export function getLocalHourInZone(timeZone: string = "UTC", now: Date = new Date()): number {
  const hourStr = getCachedDateFormat("en-US", {
    timeZone,
    hour: "numeric",
    hour12: false,
  }).format(now);
  return parseInt(hourStr, 10) % 24;
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/** Returns 0 (Sunday) through 6 (Saturday) in the given IANA timezone. */
export function getLocalDayOfWeekInZone(timeZone: string = "UTC", now: Date = new Date()): number {
  const weekday = getCachedDateFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(now);
  return WEEKDAY_INDEX[weekday] ?? now.getUTCDay();
}

export function calendarDaysBetween(fromDate: string, toDate: string): number {
  const [y1, m1, d1] = fromDate.split("-").map(Number);
  const [y2, m2, d2] = toDate.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export function formatInstantInZone(
  instant: Date,
  timeZone: string = "UTC",
  options?: Intl.DateTimeFormatOptions,
  locale: string = "en"
): string {
  return getCachedDateFormat(locale, { timeZone, ...options }).format(instant);
}
