/**
 * Timezone and Calendar Utilities for scheduled notification crons and date deltas.
 */

import { getCachedDateFormat } from "@kaesava/types";

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

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function getZonedParts(instant: Date, timeZone: string): ZonedParts {
  const parts = getCachedDateFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: pick("year"),
    month: pick("month"),
    day: pick("day"),
    hour: pick("hour") % 24,
    minute: pick("minute"),
    second: pick("second"),
  };
}

function getTimeZoneOffsetMs(instant: Date, timeZone: string): number {
  const p = getZonedParts(instant, timeZone);
  const zonedUtcMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  const instantSecMs = Math.floor(instant.getTime() / 1000) * 1000;
  return zonedUtcMs - instantSecMs;
}

function parseLocalIsoParts(localIsoWithoutZone: string): ZonedParts & { ms: number } {
  const [datePart, timePart = "00:00:00"] = localIsoWithoutZone.trim().split(/[T ]/);
  const [year, month, day] = datePart.split("-").map(Number);
  const [hms, msPart = "0"] = timePart.split(".");
  const [hour = 0, minute = 0, second = 0] = hms.split(":").map(Number);
  const ms = Number(msPart.slice(0, 3).padEnd(3, "0"));
  return { year, month, day, hour, minute, second, ms };
}

/**
 * Converts a wall-clock ISO string without timezone offset in `timeZone` to a UTC `Date`
 * using two-pass Intl offset resolution for DST safety.
 */
export function zonedTimeToUtc(localIsoWithoutZone: string, timeZone: string = "UTC"): Date {
  const p = parseLocalIsoParts(localIsoWithoutZone);
  const guessMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, p.ms);
  const offset1 = getTimeZoneOffsetMs(new Date(guessMs), timeZone);
  const candidateMs = guessMs - offset1;
  const offset2 = getTimeZoneOffsetMs(new Date(candidateMs), timeZone);
  return new Date(offset2 !== offset1 ? guessMs - offset2 : candidateMs);
}

/**
 * Projects a UTC `Date` instant into wall-clock calendar fields in `timeZone`
 * represented as a UTC-aligned `Date`.
 */
export function utcToZonedTime(utcDate: Date, timeZone: string = "UTC"): Date {
  const p = getZonedParts(utcDate, timeZone);
  return new Date(
    Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second, utcDate.getUTCMilliseconds())
  );
}
