import { describe, expect, it } from "vitest";
import { CalendarWindowInputSchema, validateDateWindow } from "./index";

describe("calendar router validation", () => {
  it("accepts valid date windows within limit", () => {
    const res = validateDateWindow("2026-11-01", "2026-11-07");
    expect(res).toEqual({ startDate: "2026-11-01", endDate: "2026-11-07", dayCount: 7 });
  });

  it("rejects inverted date windows", () => {
    const parsed = CalendarWindowInputSchema.safeParse({
      startDate: "2026-11-10",
      endDate: "2026-11-01",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects windows exceeding maxDays", () => {
    expect(() => validateDateWindow("2026-01-01", "2026-06-01", 93)).toThrow();
  });
});
