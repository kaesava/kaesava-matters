import { z } from "zod";
import { DEFAULT_LOCALE, DEFAULT_TIMEZONE, getCountryDefaults } from "./locale.types.js";

export interface FormatterTenant {
  country?: string | null;
  currency?: string | null;
  timezone?: string | null;
  locale?: string | null;
}

export const DEFAULT_TENANT_FORMATTER: FormatterTenant = {
  country: "AU",
  currency: "AUD",
  timezone: DEFAULT_TIMEZONE,
  locale: DEFAULT_LOCALE,
};

const dateFormatCache = new Map<string, Intl.DateTimeFormat>();

export function getLocaleFromCountry(countryCode?: string | null): string {
  if (!countryCode) return DEFAULT_LOCALE;
  return getCountryDefaults(countryCode).locale;
}

export function getCurrencyFromCountry(countryCode?: string | null): string {
  if (!countryCode) return "AUD";
  return getCountryDefaults(countryCode).currency;
}

export function getCachedDateFormat(
  locale: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let fmt = dateFormatCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    dateFormatCache.set(key, fmt);
  }
  return fmt;
}

/** Returns YYYY-MM-DD formatted in the tenant timezone (safe on server, Web, and Mobile). */
export function getTenantDateString(
  date: Date = new Date(),
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER
): string {
  const timezone = tenant?.timezone || DEFAULT_TIMEZONE;
  return getCachedDateFormat("en-CA", { timeZone: timezone }).format(date);
}

/** Formats a Date at UTC calendar boundary into ISO YYYY-MM-DD without timezone drift. */
export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Converts a dollar amount (number or string) to integer cents. */
export function toCents(amount: number | string): number {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return isNaN(num) ? 0 : Math.round(num * 100);
}

/** Converts integer cents to a 2-decimal dollar number. */
export function toDollars(cents: number): number {
  return Number((cents / 100).toFixed(2));
}

export const MONEY_REGEX = /^\d{1,12}(\.\d{1,2})?$/;
export const MoneyStringSchema = z.string().regex(MONEY_REGEX, "Invalid monetary amount");
export const OptionalMoneyStringSchema = MoneyStringSchema.optional();
export const NullableMoneyStringSchema = z
  .string()
  .regex(/^(\d{1,12}(\.\d{1,2})?)?$/, "Invalid monetary amount")
  .optional()
  .nullable();

/** Canonical RRULE builder from high-level frequency enum. */
export function deriveRruleFromFrequency(freq?: string | null): string {
  if (freq === "WEEKLY") return "FREQ=WEEKLY;INTERVAL=1";
  if (freq === "FORTNIGHTLY") return "FREQ=WEEKLY;INTERVAL=2";
  if (freq === "QUARTERLY") return "FREQ=MONTHLY;INTERVAL=3";
  if (freq === "ANNUALLY" || freq === "YEARLY") return "FREQ=YEARLY;INTERVAL=1";
  return "FREQ=MONTHLY;INTERVAL=1";
}

/** Canonical RRULE period parser returning approximate cadence in days. */
export function parseRruleFrequencyDays(rrule?: string | null): number {
  if (!rrule) return 30;
  const upper = rrule.toUpperCase();
  if (upper.includes("FREQ=DAILY")) return 1;
  if (upper.includes("FREQ=WEEKLY") && upper.includes("INTERVAL=2")) return 14;
  if (upper.includes("FREQ=WEEKLY")) return 7;
  if (upper.includes("FREQ=FORTNIGHTLY")) return 14;
  if (upper.includes("FREQ=QUARTERLY") || (upper.includes("FREQ=MONTHLY") && upper.includes("INTERVAL=3"))) {
    return 90;
  }
  if (upper.includes("FREQ=YEARLY") || upper.includes("FREQ=ANNUALLY")) return 365;
  return 30;
}
