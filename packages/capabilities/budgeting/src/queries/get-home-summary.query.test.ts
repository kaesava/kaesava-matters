import { describe, it, expect, vi } from "vitest";
import { getHomeSummaryQuery } from "./get-home-summary.query.js";
import {
  DbOrTx,
  envelopes,
  bankAccounts,
  incomeEvents,
  expenseEvents,
  transferEvents,
  userPreferences,
  tenants,
  transactionLedger,
} from "@kaesava/db";

describe("getHomeSummaryQuery", () => {
  it("computes safe to spend, daily pace, and groups attention items cleanly", async () => {
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const queryObj: Record<string, unknown> = {
          from: vi.fn().mockImplementation(() => queryObj),
          where: vi.fn().mockImplementation(() => queryObj),
          leftJoin: vi.fn().mockImplementation(() => queryObj),
          orderBy: vi.fn().mockResolvedValue([]),
          limit: vi.fn().mockResolvedValue([{ timezone: "Australia/Sydney" }]),
          groupBy: vi.fn().mockResolvedValue([{ envelopeId: "env-1", balance: "250.00" }]),
        };

        // When awaited directly or via then
        queryObj.then = (resolve: (v: unknown[]) => void) => {
          resolve([
            {
              id: "env-1",
              name: "Groceries",
              envelopeType: "EVERYDAY",
              bankAccountId: "acc-1",
              safetyBufferFloor: "50.00",
              monthlyAmount: "800.00",
              targetAmount: null,
              isPrivate: false,
              userId: null,
              bankAccountUserId: null,
            },
          ]);
        };
        return queryObj;
      }),
      execute: vi.fn().mockResolvedValue([
        { envelope_id: "env-1", balance: "250.00" }
      ]),
    };

    const res = await getHomeSummaryQuery(
      "00000000-0000-0000-0000-000000000001",
      "01908bde-34bb-7b19-a178-574211bc93aa",
      "00000000-0000-0000-0000-000000000002",
      mockDb as unknown as DbOrTx
    );

    expect(res).toBeDefined();
    expect(res.everydayBalance).toBe(250);
    expect(res.everydaySafetyBuffer).toBe(50);
    expect(res.safeToSpend).toBe(200);
    expect(res.safeToSpendCents).toBe(20000);
    expect(res.todayDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("computes per-envelope billsShortfall, includes overdue bills, ignores overdue paydays, and excludes non-BILL expenses", async () => {
    const today = new Date();
    const fmt = (offsetDays: number) => {
      const d = new Date(today.getTime() + offsetDays * 86400000);
      return d.toISOString().slice(0, 10);
    };

    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        let targetTable: unknown = null;
        const queryObj: Record<string, unknown> = {
          from: vi.fn().mockImplementation((t: unknown) => {
            targetTable = t;
            return queryObj;
          }),
          where: vi.fn().mockImplementation(() => queryObj),
          leftJoin: vi.fn().mockImplementation(() => queryObj),
          orderBy: vi.fn().mockImplementation(() => {
            if (targetTable === incomeEvents) {
              return Promise.resolve([
                { id: "inc-overdue", name: "Old Pay", expectedAmount: "2000.00", expectedDate: fmt(-5), sourceName: "Work", bankAccountId: "acc-1", status: "PENDING", bankAccountIsPrivate: false, bankAccountUserId: null },
                { id: "inc-next", name: "Next Pay", expectedAmount: "2000.00", expectedDate: fmt(10), sourceName: "Work", bankAccountId: "acc-1", status: "PENDING", bankAccountIsPrivate: false, bankAccountUserId: null },
              ]);
            }
            if (targetTable === expenseEvents) {
              return Promise.resolve([
                // Overdue BILL in env-rent (balance 0) -> $500 shortfall
                { id: "exp-1", name: "Rent", expectedAmount: "500.00", expectedDate: fmt(-2), envelopeId: "env-rent", status: "PENDING" },
                // Upcoming BILL within horizon in env-power (balance 2000) -> $0 shortfall
                { id: "exp-2", name: "Power", expectedAmount: "100.00", expectedDate: fmt(5), envelopeId: "env-power", status: "PENDING" },
                // GOAL expense -> must NOT affect billsShortfall
                { id: "exp-3", name: "Holiday", expectedAmount: "900.00", expectedDate: fmt(3), envelopeId: "env-goal", status: "PENDING" },
              ]);
            }
            if (targetTable === transferEvents) return Promise.resolve([]);
            return Promise.resolve([]);
          }),
          limit: vi.fn().mockImplementation(() => {
            if (targetTable === userPreferences) return Promise.resolve([{ timezone: "UTC" }]);
            if (targetTable === tenants) return Promise.resolve([{ createdAt: new Date() }]);
            return Promise.resolve([]);
          }),
          groupBy: vi.fn().mockResolvedValue([
            { envelopeId: "env-everyday", balance: "150.00" },
            { envelopeId: "env-rent", balance: "0.00" },
            { envelopeId: "env-power", balance: "2000.00" },
            { envelopeId: "env-goal", balance: "0.00" },
          ]),
        };

        queryObj.then = (resolve: (v: unknown[]) => void) => {
          if (targetTable === envelopes) {
            resolve([
              { id: "env-everyday", name: "Everyday", envelopeType: "EVERYDAY", bankAccountId: "acc-1", safetyBufferFloor: "300.00", monthlyAmount: "800.00", targetAmount: null, fundingMode: "RECURRING", isPriority: false, isPrivate: false, userId: null, bankAccountUserId: null, bankAccountIsPrivate: false },
              { id: "env-rent", name: "Rent", envelopeType: "BILL", bankAccountId: "acc-1", safetyBufferFloor: "0.00", monthlyAmount: "500.00", targetAmount: null, fundingMode: "RECURRING", isPriority: true, isPrivate: false, userId: null, bankAccountUserId: null, bankAccountIsPrivate: false },
              { id: "env-power", name: "Power", envelopeType: "BILL", bankAccountId: "acc-1", safetyBufferFloor: "0.00", monthlyAmount: "100.00", targetAmount: null, fundingMode: "RECURRING", isPriority: true, isPrivate: false, userId: null, bankAccountUserId: null, bankAccountIsPrivate: false },
              { id: "env-goal", name: "Holiday", envelopeType: "GOAL", bankAccountId: "acc-1", safetyBufferFloor: "0.00", monthlyAmount: null, targetAmount: "1000.00", fundingMode: "TARGET_BALANCE", isPriority: false, isPrivate: false, userId: null, bankAccountUserId: null, bankAccountIsPrivate: false },
            ]);
          } else if (targetTable === bankAccounts) {
            resolve([{ id: "acc-1", name: "Main", lastKnownBalance: "2150.00", unbudgetedBuffer: "0.00", lastBalanceMatchedAt: null, isPrivate: false, userId: null }]);
          } else if (targetTable === incomeEvents) {
            resolve([{ count: 1 }]);
          } else if (targetTable === transactionLedger) {
            resolve([]);
          } else {
            resolve([]);
          }
        };
        return queryObj;
      }),
    };

    const res = await getHomeSummaryQuery(
      "00000000-0000-0000-0000-000000000001",
      "01908bde-34bb-7b19-a178-574211bc93aa",
      "00000000-0000-0000-0000-000000000002",
      mockDb as unknown as DbOrTx
    );

    expect(res.nextPayday?.id).toBe("inc-next");
    expect(res.daysToPayday).toBe(10);
    expect(res.everydayBalance).toBe(150);
    expect(res.everydaySafetyBuffer).toBe(300);
    expect(res.safeToSpend).toBe(0);
    expect(res.billsShortfall).toBe(500);
    expect(res.billsDueInHorizonCount).toBe(2);
    expect(res.totalBillsDueInHorizon).toBe(600);
  });
});
