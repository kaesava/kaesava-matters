import {
  DEFAULT_TENANT_FORMATTER,
  type FormatterTenant,
  getCachedDateFormat,
  getCurrencyFromCountry,
  getLocaleFromCountry,
  getTenantDateString,
  toCents,
  toDollars,
} from "@money-matters/types";

export {
  DEFAULT_TENANT_FORMATTER,
  type FormatterTenant,
  getCachedDateFormat,
  getCurrencyFromCountry,
  getLocaleFromCountry,
  getTenantDateString,
  toCents,
  toDollars,
};

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function getCachedNumberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}:${JSON.stringify(options)}`;
  let fmt = numberFormatCache.get(key);
  if (!fmt) {
    fmt = new Intl.NumberFormat(locale, options);
    numberFormatCache.set(key, fmt);
  }
  return fmt;
}

/** Format a number/string as currency based on tenant country rules. */
export function formatCurrency(
  amount: number | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.NumberFormatOptions
): string {
  if (amount == null) return "";
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "";

  const locale = tenant?.locale || getLocaleFromCountry(tenant?.country);
  const currency = tenant?.currency || getCurrencyFromCountry(tenant?.country);

  return getCachedNumberFormat(locale, {
    style: "currency",
    currency,
    ...options,
  }).format(num);
}

/** Format a date object/string based on tenant timezone rules. */
export function formatDate(
  date: Date | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  const locale = tenant?.locale || getLocaleFromCountry(tenant?.country);
  const timezone = tenant?.timezone || DEFAULT_TENANT_FORMATTER.timezone!;

  return getCachedDateFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(d);
}

/** Format a datetime object/string based on tenant timezone rules. */
export function formatDateTime(
  date: Date | string | null | undefined,
  tenant: FormatterTenant = DEFAULT_TENANT_FORMATTER,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;

  const locale = tenant?.locale || getLocaleFromCountry(tenant?.country);
  const timezone = tenant?.timezone || DEFAULT_TENANT_FORMATTER.timezone!;

  return getCachedDateFormat(locale, {
    timeZone: timezone,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    ...options,
  }).format(d);
}
