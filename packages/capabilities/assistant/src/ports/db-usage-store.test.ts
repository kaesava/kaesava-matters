import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { DbUsageStore } from "./db-usage-store.js";

describe("DbUsageStore", () => {
  it("computes remaining calls accurately from monthly limit", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ llmCalls: 35 }]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const store = new DbUsageStore(mockDb as unknown as DbOrTx);
    const usage = await store.getUsage("tenant-123");

    expect(usage.used).toBe(35);
    expect(usage.limit).toBe(150);
    expect(usage.remaining).toBe(115);
  });

  it("returns full quota when no row exists yet for current month", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn(),
    };

    const store = new DbUsageStore(mockDb as unknown as DbOrTx);
    const usage = await store.getUsage("tenant-456");

    expect(usage.used).toBe(0);
    expect(usage.remaining).toBe(150);
  });

  it("resets usage to 0 of 150 when the UTC month rolls over", async () => {
    let currentTime = new Date("2026-11-30T23:59:59Z");
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(
              currentTime.getUTCMonth() === 10 ? [{ llmCalls: 42 }] : []
            ),
          }),
        }),
      })),
    };

    const store = new DbUsageStore(mockDb as unknown as DbOrTx, () => currentTime);
    const novUsage = await store.getUsage("tenant-123");
    expect(novUsage).toEqual({
      used: 42,
      limit: 150,
      remaining: 108,
      resetsOn: "2026-12-01",
    });

    currentTime = new Date("2026-12-01T00:00:00Z");
    const decUsage = await store.getUsage("tenant-123");
    expect(decUsage).toEqual({
      used: 0,
      limit: 150,
      remaining: 150,
      resetsOn: "2027-01-01",
    });
  });

  it("sets llmCalls to 1 on first increment and returns false when at limit", async () => {
    const returningMock = vi.fn().mockResolvedValueOnce([{ id: "row-1" }]).mockResolvedValueOnce([]);
    const onConflictDoUpdateMock = vi.fn().mockReturnValue({ returning: returningMock });
    const valuesMock = vi.fn().mockReturnValue({ onConflictDoUpdate: onConflictDoUpdateMock });
    const insertMock = vi.fn().mockReturnValue({ values: valuesMock });

    const store = new DbUsageStore({ insert: insertMock } as unknown as DbOrTx, () => new Date("2026-11-20T12:00:00Z"));

    expect(await store.incrementLlmCalls("tenant-123", 150)).toBe(true);
    expect(valuesMock).toHaveBeenCalledWith({
      tenantId: "tenant-123",
      appId: expect.any(String),
      periodMonth: "2026-11-01",
      llmCalls: 1,
    });
    expect(await store.incrementLlmCalls("tenant-123", 150)).toBe(false);
    expect(await store.incrementLlmCalls("tenant-123", 0)).toBe(false);
  });

  it("decrements llmCalls on refund without dropping below 0", async () => {
    const whereMock = vi.fn().mockResolvedValue(undefined);
    const setMock = vi.fn().mockReturnValue({ where: whereMock });
    const updateMock = vi.fn().mockReturnValue({ set: setMock });

    const store = new DbUsageStore({ update: updateMock } as unknown as DbOrTx);
    await store.decrementLlmCalls("tenant-123");

    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(whereMock).toHaveBeenCalledTimes(1);
  });
});
