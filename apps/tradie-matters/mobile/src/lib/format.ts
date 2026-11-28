import { t } from "@kaesava/i18n";
import {
  formatCurrency,
  getCurrencySymbol,
  fmtDate as uiFmtDate,
  fmtDateIso as uiFmtDateIso,
} from "@kaesava/ui/format";
import {
  getMobileLocaleConfig,
  setMobileLocaleConfig,
  type MobileLocaleConfig,
} from "./locale-config";

export { getMobileLocaleConfig, setMobileLocaleConfig, type MobileLocaleConfig };

export function formatMobileCurrency(
  value: number | string,
  currency?: string,
  locale?: string
): string {
  const cfg = getMobileLocaleConfig();
  return formatCurrency(value, locale || cfg.locale, currency || cfg.currency);
}

export function getMobileCurrencySymbol(currency?: string, locale?: string): string {
  const cfg = getMobileLocaleConfig();
  return getCurrencySymbol(locale || cfg.locale, currency || cfg.currency);
}

export function formatMobileCurrencyCompact(
  value: number | string,
  currency?: string,
  locale?: string
): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  const sym = getMobileCurrencySymbol(currency, locale);
  if (isNaN(num)) return `${sym}0`;
  if (Math.abs(num) >= 1000) return `${sym}${(num / 1000).toFixed(1)}k`;
  return `${sym}${num.toFixed(0)}`;
}

export function formatIsoDate(
  input?: string | Date | number | null,
  timeZone?: string
): string {
  return uiFmtDateIso(input, timeZone || getMobileLocaleConfig().timezone);
}

export function formatDate(
  date: string | Date | null | undefined,
  locale?: string,
  timeZone?: string
): string {
  if (!date) return "";
  const cfg = getMobileLocaleConfig();
  const formatted = uiFmtDate(date, timeZone || cfg.timezone, locale || cfg.locale);
  return formatted === "N/A" ? "" : formatted;
}

export function formatRelativeDate(
  date: string | Date | null | undefined,
  locale?: string,
  timeZone?: string
): string {
  if (!date) return "";
  const cfg = getMobileLocaleConfig();
  const tz = timeZone || cfg.timezone;
  const targetIso = formatIsoDate(date, tz);
  if (!targetIso) return "";
  if (targetIso === formatIsoDate(new Date(), tz)) return t("common.today");
  if (targetIso === formatIsoDate(new Date(Date.now() - 86_400_000), tz)) {
    return t("common.yesterday");
  }
  return formatDate(date, locale, tz);
}
