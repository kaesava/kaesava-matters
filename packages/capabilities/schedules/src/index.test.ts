import { describe, it, expect } from "vitest";
import type { ScheduleOccurrenceRecord, ScheduleSeriesDefinition } from "@kaesava/types";
import { createSchedulesCapability, type ScheduleStoreAdapter } from "./index.js";

describe("@kaesava/capability-schedules", () => {
  it("bursts quarterly HVAC maintenance jobs for TradieMatters and plans THIS_AND_FOLLOWING edits", async () => {
    const tenantId = "00000000-0000-0000-0000-000000000001";
    const appId = "01908bde-9999-7b19-a178-574211bc93ff";
    const seriesId = "00000000-0000-0000-0000-000000000010";

    const series: ScheduleSeriesDefinition = {
      id: seriesId,
      tenantId,
      appId,
      name: "Quarterly HVAC Service",
      rrule: "FREQ=MONTHLY;INTERVAL=3",
      startDate: "2026-03-01",
      endDate: null,
      lastBurstDate: null,
    };
    const occurrences: ScheduleOccurrenceRecord[] = [];

    const store: ScheduleStoreAdapter = {
      async getSeries(tid, sid) {
        return tid === tenantId && sid === seriesId ? series : null;
      },
      async listOccurrences() {
        return occurrences;
      },
      async insertOccurrences(_tid, _aid, sid, dates) {
        const created: ScheduleOccurrenceRecord[] = dates.map((d, idx) => ({
          id: `occ-${idx + 1}`,
          seriesId: sid,
          expectedDate: d,
          status: "PENDING",
          isException: false,
        }));
        occurrences.push(...created);
        return created;
      },
    };

    const schedules = createSchedulesCapability(store);
    const created = await schedules.burstSeries(
      tenantId,
      appId,
      seriesId,
      "2026-03-01",
      "Australia/Melbourne",
      12
    );
    expect(created.length).toBeGreaterThanOrEqual(4);

    // Idempotent second burst creates 0 duplicates
    const secondBurst = await schedules.burstSeries(
      tenantId,
      appId,
      seriesId,
      "2026-03-01",
      "Australia/Melbourne",
      12
    );
    expect(secondBurst).toHaveLength(0);

    const plan = await schedules.planEdit({
      tenantId,
      seriesId,
      scope: "THIS_AND_FOLLOWING",
      fromDate: created[1].expectedDate,
      updatedRrule: "FREQ=MONTHLY;INTERVAL=2",
      timezone: "Australia/Melbourne",
    });
    expect(plan.purgePendingFromDate).toBe(created[1].expectedDate);
    expect(plan.keepOccurrenceDates).toContain(created[0].expectedDate);
    expect(plan.newOccurrenceDates.length).toBeGreaterThan(0);
  });
});
