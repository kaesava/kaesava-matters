import { describe, it, expect, vi } from "vitest";
import {
  createArchiveRegistry,
  getArchiveBatchWindow,
  computeRecurringDates,
  planSeriesEditScope,
  canRolePerform,
  buildCorsHeaders,
  sanitizeSentryEvent,
} from "../index.js";

describe("Platform Core Engines", () => {
  it("createArchiveRegistry lists and sorts archived items across adapters and dispatches restore", async () => {
    const restoreJob = vi.fn().mockResolvedValue({ id: "job-1", restored: true });
    const registry = createArchiveRegistry([
      {
        itemType: "JOB",
        listArchived: async () => [
          { id: "job-1", name: "Fix Pipe", itemType: "JOB", subtitle: "Plumbing", archivedAt: new Date("2026-05-02T00:00:00Z") },
        ],
        restoreItem: restoreJob,
      },
      {
        itemType: "CLIENT",
        listArchived: async () => [
          { id: "c-1", name: "Acme", itemType: "CLIENT", subtitle: null, archivedAt: new Date("2026-05-05T00:00:00Z") },
        ],
        restoreItem: vi.fn(),
      },
    ]);

    const items = await registry.listArchivedItems({ db: {}, tenantId: "t1", appId: "a1" });
    expect(items.map((i) => i.id)).toEqual(["c-1", "job-1"]);

    await registry.restoreArchivedItem({ db: {}, tenantId: "t1", appId: "a1", userId: "u1" }, "JOB", "job-1");
    expect(restoreJob).toHaveBeenCalledWith({ db: {}, tenantId: "t1", appId: "a1", userId: "u1", itemId: "job-1" });
  });

  it("getArchiveBatchWindow computes +/- 2000ms cascade window", () => {
    const base = new Date("2026-01-01T00:00:10.000Z");
    const { windowStart, windowEnd } = getArchiveBatchWindow(base);
    expect(windowStart.toISOString()).toBe("2026-01-01T00:00:08.000Z");
    expect(windowEnd.toISOString()).toBe("2026-01-01T00:00:12.000Z");
  });

  it("computeRecurringDates bursts monthly dates with end-of-month clamping", () => {
    const dates = computeRecurringDates({
      rrule: "FREQ=MONTHLY",
      startDate: "2026-01-31",
      fromDate: "2026-01-31",
      horizonMonths: 3,
      timezone: "Australia/Melbourne",
    });
    expect(dates).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("planSeriesEditScope supports SINGLE_OCCURRENCE, THIS_AND_FOLLOWING, and ENTIRE_SERIES", () => {
    const series = {
      id: "s1",
      tenantId: "t1",
      appId: "a1",
      name: "Weekly Standup",
      rrule: "FREQ=WEEKLY",
      startDate: "2026-01-01",
      endDate: null,
      lastBurstDate: "2026-01-22",
    };
    const occurrences = [
      { id: "o1", seriesId: "s1", expectedDate: "2026-01-01", status: "CONFIRMED" as const },
      { id: "o2", seriesId: "s1", expectedDate: "2026-01-08", status: "PENDING" as const },
      { id: "o3", seriesId: "s1", expectedDate: "2026-01-15", status: "PENDING" as const },
    ];

    const single = planSeriesEditScope({
      scope: "SINGLE_OCCURRENCE",
      fromDate: "2026-01-08",
      existingSeries: series,
      occurrences,
      updatedRrule: "FREQ=WEEKLY",
      timezone: "UTC",
    });
    expect(single.purgePendingFromDate).toBeNull();
    expect(single.newOccurrenceDates).toEqual([]);

    const split = planSeriesEditScope({
      scope: "THIS_AND_FOLLOWING",
      fromDate: "2026-01-08",
      existingSeries: series,
      occurrences,
      updatedRrule: "FREQ=WEEKLY;INTERVAL=2",
      timezone: "UTC",
      horizonMonths: 1,
    });
    expect(split.truncateSeriesEndDate).toBe("2026-01-07");
    expect(split.keepOccurrenceDates).toEqual(["2026-01-01"]);
    expect(split.newOccurrenceDates[0]).toBe("2026-01-08");
  });

  it("canRolePerform enforces OWNER, MEMBER, and VIEWER RBAC", () => {
    expect(canRolePerform("OWNER", "delete_tenant")).toBe(true);
    expect(canRolePerform("MEMBER", "write")).toBe(true);
    expect(canRolePerform("MEMBER", "manage_billing")).toBe(false);
    expect(canRolePerform("VIEWER", "read")).toBe(true);
    expect(canRolePerform("VIEWER", "write")).toBe(false);
  });

  it("buildCorsHeaders includes x-app-id and supports custom allowedHosts", () => {
    const headers = buildCorsHeaders("https://app.tradiepro.com.au", false, [".tradiepro.com.au"]);
    expect(headers["Access-Control-Allow-Origin"]).toBe("https://app.tradiepro.com.au");
    expect(headers["Access-Control-Allow-Headers"]).toContain("x-app-id");
  });

  it("sanitizeSentryEvent strips authorization, cookie, and x-tenant-id headers", () => {
    const cleaned = sanitizeSentryEvent({
      request: {
        headers: {
          authorization: "Bearer secret",
          cookie: "session=abc",
          "x-tenant-id": "t-123",
          "user-agent": "Mozilla/5.0",
        },
      },
    });
    const hdrs = (cleaned.request as { headers: Record<string, unknown> }).headers;
    expect(hdrs.authorization).toBeUndefined();
    expect(hdrs.cookie).toBeUndefined();
    expect(hdrs["x-tenant-id"]).toBeUndefined();
    expect(hdrs["user-agent"]).toBe("Mozilla/5.0");
  });
});
