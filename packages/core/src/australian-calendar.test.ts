import { describe, it, expect } from "vitest";
import { todayInZone, calendarDaysBetween } from "./australian-calendar.js";

describe("Calendar & Timezone Utilities", () => {
  it("calculates todayInZone across different Australian timezones", () => {
    const instant = new Date("2026-06-01T15:00:00Z");
    expect(todayInZone("Australia/Sydney", instant)).toBe("2026-06-02");
    expect(todayInZone("Australia/Perth", instant)).toBe("2026-06-01");
  });

  it("calculates calendar days between dates correctly without time offset drift", () => {
    expect(calendarDaysBetween("2026-10-25", "2026-10-25")).toBe(0);
    expect(calendarDaysBetween("2026-10-25", "2026-10-26")).toBe(1);
    expect(calendarDaysBetween("2026-10-25", "2026-11-08")).toBe(14);
    expect(calendarDaysBetween("2026-11-08", "2026-10-25")).toBe(-14);
  });
});
