import { describe, expect, it } from "vitest";
import {
  formatInstantInZone,
  getLocalDayOfWeekInZone,
  getLocalHourInZone,
  utcToZonedTime,
  zonedTimeToUtc,
} from "./intl-calendar.js";

describe("intl-calendar zoned & DST utilities", () => {
  it("resolves local hour in zone including midnight normalization (0 instead of 24)", () => {
    const utcMidnight = new Date("2026-06-01T00:00:00Z");
    expect(getLocalHourInZone("UTC", utcMidnight)).toBe(0);

    // 2026-06-01T14:00:00Z is 00:00 AEST (+10) on 2026-06-02 in Australia/Sydney
    const sydneyMidnight = new Date("2026-06-01T14:00:00Z");
    expect(getLocalHourInZone("Australia/Sydney", sydneyMidnight)).toBe(0);

    // 2026-06-01T14:00:00Z is 10:00 EDT (-4) in America/New_York
    expect(getLocalHourInZone("America/New_York", sydneyMidnight)).toBe(10);
  });

  it("resolves local day of week across timezone date boundaries", () => {
    // 2026-11-28 is a Saturday in UTC (6), but at 15:00Z it is Sunday 02:00 AEDT in Sydney (0)
    const instant = new Date("2026-11-28T15:00:00Z");
    expect(getLocalDayOfWeekInZone("UTC", instant)).toBe(6);
    expect(getLocalDayOfWeekInZone("Australia/Sydney", instant)).toBe(0);
    expect(getLocalDayOfWeekInZone("America/Los_Angeles", instant)).toBe(6);
  });

  it("formats instants in a target timezone and locale", () => {
    const instant = new Date("2026-06-15T03:30:00Z");
    const formatted = formatInstantInZone(
      instant,
      "Australia/Brisbane",
      { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false },
      "en-CA"
    );
    expect(formatted).toContain("2026-06-15");
    expect(formatted).toContain("13:30");
  });

  it("converts wall-clock local ISO strings to UTC across standard and DST offsets", () => {
    // Australia/Brisbane is always AEST (UTC+10)
    expect(zonedTimeToUtc("2026-06-01T10:00:00", "Australia/Brisbane").toISOString()).toBe(
      "2026-06-01T00:00:00.000Z"
    );

    // Australia/Sydney winter (AEST UTC+10) vs summer (AEDT UTC+11)
    expect(zonedTimeToUtc("2026-06-01T10:00:00", "Australia/Sydney").toISOString()).toBe(
      "2026-06-01T00:00:00.000Z"
    );
    expect(zonedTimeToUtc("2026-01-15T11:00:00", "Australia/Sydney").toISOString()).toBe(
      "2026-01-15T00:00:00.000Z"
    );

    // Preserves milliseconds and space-separated date-time strings
    expect(zonedTimeToUtc("2026-06-01 10:30:45.123", "Australia/Brisbane").toISOString()).toBe(
      "2026-06-01T00:30:45.123Z"
    );
  });

  it("projects UTC instants to zoned wall-clock Date and round-trips across DST", () => {
    const instant = new Date("2026-01-15T13:45:30.250Z");
    const zoned = utcToZonedTime(instant, "Australia/Sydney"); // AEDT UTC+11 => 2026-01-16 00:45:30.250
    expect(zoned.toISOString()).toBe("2026-01-16T00:45:30.250Z");

    const roundTripped = zonedTimeToUtc("2026-01-16T00:45:30.250", "Australia/Sydney");
    expect(roundTripped.toISOString()).toBe(instant.toISOString());
  });
});
