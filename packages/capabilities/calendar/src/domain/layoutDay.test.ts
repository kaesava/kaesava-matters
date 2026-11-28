import { describe, expect, it } from "vitest";
import { addDays, getDayRange, getWeekRange, startOfWeekIso } from "./dateRange";
import { layoutDay } from "./layoutDay";
import type { CalendarEventItem } from "./types";

function makeEvent(id: string, startHour: string, endHour: string): CalendarEventItem {
  return {
    id,
    resourceId: "res-1",
    title: `Job ${id}`,
    startIso: `2026-11-30T${startHour}:00Z`,
    endIso: `2026-11-30T${endHour}:00Z`,
  };
}

describe("layoutDay", () => {
  it("assigns single column when events do not overlap", () => {
    const res = layoutDay([
      makeEvent("a", "08:00", "09:00"),
      makeEvent("b", "09:00", "10:30"),
    ]);
    expect(res.events).toHaveLength(2);
    expect(res.events[0]).toMatchObject({ id: "a", column: 0, totalColumns: 1 });
    expect(res.events[1]).toMatchObject({ id: "b", column: 0, totalColumns: 1 });
  });

  it("solves overlapping connected components with greedy interval coloring", () => {
    const res = layoutDay([
      makeEvent("a", "08:00", "10:00"),
      makeEvent("b", "08:30", "09:30"),
      makeEvent("c", "09:30", "11:00"),
      makeEvent("d", "13:00", "14:00"),
    ]);
    expect(res.events[0]).toMatchObject({ id: "a", column: 0, totalColumns: 2 });
    expect(res.events[1]).toMatchObject({ id: "b", column: 1, totalColumns: 2 });
    expect(res.events[2]).toMatchObject({ id: "c", column: 1, totalColumns: 2 });
    expect(res.events[3]).toMatchObject({ id: "d", column: 0, totalColumns: 1 });
  });
});

describe("dateRange helpers", () => {
  it("computes Monday-start week range and day range", () => {
    expect(startOfWeekIso("2026-11-28", 1)).toBe("2026-11-23");
    expect(addDays("2026-11-28", 2)).toBe("2026-11-30");
    const week = getWeekRange("2026-11-28", 1);
    expect(week.dates).toHaveLength(7);
    expect(week.dates[0]).toBe("2026-11-23");
    expect(week.dates[6]).toBe("2026-11-29");
    const day = getDayRange("2026-11-28");
    expect(day.dates).toEqual(["2026-11-28"]);
  });
});
