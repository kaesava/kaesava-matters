import { describe, expect, it } from "vitest";
import {
  formatIsoDate,
  formatMobileCurrency,
  formatMobileCurrencyCompact,
  setMobileLocaleConfig,
} from "../format";

describe("mobile formatters", () => {
  it("formats currency and compact currency using locale config", () => {
    setMobileLocaleConfig({ locale: "en-AU", timezone: "Australia/Melbourne", currency: "AUD" });
    expect(formatMobileCurrency(1234.5)).toContain("1,234.50");
    expect(formatMobileCurrencyCompact(1500)).toBe("$1.5k");
    expect(formatMobileCurrencyCompact(250)).toBe("$250");
  });

  it("formats ISO dates in presentation timezone", () => {
    setMobileLocaleConfig({ locale: "en-AU", timezone: "Australia/Melbourne", currency: "AUD" });
    const iso = formatIsoDate("2026-11-28T00:00:00.000Z");
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
