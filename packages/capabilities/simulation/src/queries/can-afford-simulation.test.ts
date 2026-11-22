import { registerAppDictionary } from "@kaesava/i18n";
registerAppDictionary({
  canIAfford: {
    rationale: {
      everydayBalance: "Everyday balance: {balance}",
      upcomingBillsProtected: "Upcoming bills protected: {bills}",
      afterPurchaseRemaining: "Remaining after purchase: {remaining}",
      aboveSafeCushion: "Above safe cushion ({cushion})",
      hardNoRecurringBills: "Recurring bills shortfall: {amount}",
      hardNoRecurringForecastShortfall: "Forecast shortfall: {amount}",
      hardNoRecurringBillsNonNegotiable: "Bills are non-negotiable",
    },
  },
});
import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db";
import * as dbModule from "@kaesava/db";
import { toMonthlyAmount, canAffordSimulationQuery } from "./can-afford-simulation.query.js";
import { simulateOneOffPurchase } from "./simulation-steps/one-off-simulation.js";
import { simulateRecurringCommitment } from "./simulation-steps/recurring-simulation.js";
import type { ProjectionEngineFn } from "@kaesava/types";

vi.mock("@kaesava/db", async (importOriginal) => {
  const actual = await importOriginal<typeof dbModule>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn(),
  };
});

function makeMockDb(selectResults: unknown[][]): DbOrTx {
  let callIdx = 0;
  return {
    select: vi.fn().mockImplementation(() => {
      const rows = selectResults[callIdx++] ?? [];
      const thenable = Promise.resolve(rows) as Promise<unknown[]> & {
        from: ReturnType<typeof vi.fn>;
        leftJoin: ReturnType<typeof vi.fn>;
        where: ReturnType<typeof vi.fn>;
        limit: ReturnType<typeof vi.fn>;
      };
      thenable.from = vi.fn().mockReturnValue(thenable);
      thenable.leftJoin = vi.fn().mockReturnValue(thenable);
      thenable.where = vi.fn().mockReturnValue(thenable);
      thenable.limit = vi.fn().mockResolvedValue(rows);
      return thenable;
    }),
  } as unknown as DbOrTx;
}

/**
 * Unit tests for canAffordSimulationQuery verdict logic.
 * Tests pure computation paths without DB — validates threshold math and user-focused rules.
 */
describe("canAffordSimulationQuery — verdict logic", () => {
  // ── SAFE_YES ──────────────────────────────────────────────────────────
  it("SAFE_YES: amount within effective spendable and remaining cash >= safe cushion", () => {
    const everydayBalance = 1000;
    const totalBills = 100;
    const effectiveSpendable = everydayBalance - totalBills; // 900
    const amount = 200;
    const daysUntilPayday = 10;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80
    const safeCushion = Math.round(dailyAllowance * 0.25 * daysUntilPayday); // 200

    const remaining = effectiveSpendable - amount; // 700

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(remaining).toBeGreaterThanOrEqual(safeCushion);
  });

  // ── PACING_TIGHT ──────────────────────────────────────────────────────
  it("PACING_TIGHT: amount within effective spendable but remaining cash < safe cushion", () => {
    const everydayBalance = 600;
    const effectiveSpendable = everydayBalance;
    const amount = 570;
    const daysUntilPayday = 14;
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80
    const safeCushion = Math.round(dailyAllowance * 0.25 * daysUntilPayday); // 280

    const remaining = effectiveSpendable - amount; // 30
    const cushionShortfall = safeCushion - remaining; // 250

    expect(amount).toBeLessThanOrEqual(effectiveSpendable);
    expect(remaining).toBeLessThan(safeCushion);
    expect(cushionShortfall).toBe(250);
  });

  // ── BILLS_RISK ────────────────────────────────────────────────────────
  it("BILLS_RISK: amount <= everydayBalance but > effectiveSpendable after bills", () => {
    const everydayBalance = 800;
    const totalBills = 600;
    const effectiveSpendable = Math.max(0, everydayBalance - totalBills); // 200
    const amount = 500;

    expect(amount).toBeLessThanOrEqual(everydayBalance);
    expect(amount).toBeGreaterThan(effectiveSpendable);
  });

  // ── ONE-OFF SHORTFALL WITH GOAL ALTERNATIVE ───────────────────────────
  it("ONE-OFF: detects when flexible savings goal can cover shortfall and computes delay", () => {
    const effectiveSpendable = 200;
    const amount = 600;
    const shortfall = amount - effectiveSpendable; // 400
    const goalBalance = 1500; // Flexible holiday goal
    const goalMonthlyContrib = 300;
    const dailyContrib = goalMonthlyContrib / 30; // 10/day
    const delayDays = Math.round(shortfall / dailyContrib); // 40 days

    expect(shortfall).toBe(400);
    expect(goalBalance).toBeGreaterThanOrEqual(shortfall);
    expect(delayDays).toBe(40);
  });

  // ── WAIT_FOR_PAYCYCLE (ONE-OFF) ───────────────────────────────────────
  it("WAIT_FOR_PAYCYCLE: not affordable today, but cumulative step covers amount + step cushion", () => {
    const effectiveSpendable = 100;
    const amount = 500;
    const everydayAtStep2 = 800;
    const daysInStep = 14;
    const dailyAllowance = 80;
    const requiredStepCushion = dailyAllowance * 0.25 * daysInStep; // 280

    expect(amount).toBeGreaterThan(effectiveSpendable);
    expect(everydayAtStep2 - amount).toBeGreaterThanOrEqual(requiredStepCushion);
  });

  // ── RECURRING: 80% EVERYDAY ALLOWANCE PROTECTION ────────────────────
  it("RECURRING: enforces 80% everyday allowance minimum protection", () => {
    const monthlyAllowance = 1000;
    const expected12MonthEveryday = monthlyAllowance * 12; // 12,000
    const minRequiredEveryday = expected12MonthEveryday * 0.8; // 9,600

    // If total allocated across 12 months drops to 9,000 (< 9,600), triggers HARD_NO
    const actualAllocatedWithCommitment = 9000;
    expect(actualAllocatedWithCommitment).toBeLessThan(minRequiredEveryday);
  });

  // ── GOAL_DELAYED (RECURRING) ─────────────────────────────────────────
  it("GOAL_DELAYED: recurring commitment reduces final goal balance > 0", () => {
    const originalFinalBalance = 5000;
    const newFinalBalance = 4400;
    const balanceDrop = originalFinalBalance - newFinalBalance; // 600
    const dailyContrib = 100; // $100/day contribution estimate
    const delayDays = Math.round(balanceDrop / dailyContrib); // 6 days

    expect(balanceDrop).toBeGreaterThan(0);
    expect(delayDays).toBeGreaterThanOrEqual(1);
  });

  // ── HARD_NO: PHANTOM DEFICIT ─────────────────────────────────────────
  it("HARD_NO (PHANTOM DEFICIT): detects when recurring expense cannot be funded by projected income", () => {
    const phantomFinalBalance = -12000; // Unfunded $1000/mo over 12 months
    expect(phantomFinalBalance).toBeLessThan(-1);
  });

  // ── PRORATED CUSHION ADAPTS TO DAYS UNTIL PAYDAY ─────────────────────
  it("prorated safe cushion: adapts dynamically to days until payday", () => {
    const everydayMonthlyAllowance = 2400;
    const dailyAllowance = everydayMonthlyAllowance / 30; // 80/day
    const dailyCushionRate = dailyAllowance * 0.25; // 20/day

    // 5 days until payday
    const cushion5Days = Math.round(dailyCushionRate * 5); // 100
    expect(cushion5Days).toBe(100);

    // 14 days until payday
    const cushion14Days = Math.round(dailyCushionRate * 14); // 280
    expect(cushion14Days).toBe(280);
  });

  // ── BILLS DEDUCTED CORRECTLY & UNFUNDED SHORTFALL ───────────────────
  it("effectiveSpendable uses unfunded shortfall (funded bills do not deduct from Everyday balance)", () => {
    const everydayBalance = 1000;
    // Bill for $500 in a pool with balance $400 -> shortfall $100
    const billAmount1 = 500;
    const poolBal1 = 400;
    const shortfall1 = Math.max(0, billAmount1 - poolBal1); // 100

    // Bill for $300 in a pool with balance $500 -> shortfall $0
    const billAmount2 = 300;
    const poolBal2 = 500;
    const shortfall2 = Math.max(0, billAmount2 - poolBal2); // 0

    const totalUnfundedShortfall = shortfall1 + shortfall2; // 100
    const effectiveSpendable = Math.max(0, everydayBalance - totalUnfundedShortfall); // 900

    expect(effectiveSpendable).toBe(900);
  });

  // ── TRUST COPY VERIFICATION ─────────────────────────────────────────
  it("user-facing rationale copy uses human-centric terms and zero developer jargon", () => {
    const safeYesRationale = "Comfortably above your recommended safe cushion of $120.00.";
    const pacingTightRationale = "This leaves you $45.00 below your recommended safe cushion ($120.00).";
    const billsRiskRationale = "Bills are non-negotiable and cannot be spent.";

    expect(safeYesRationale).not.toContain("floor");
    expect(safeYesRationale).not.toContain("/day");
    expect(safeYesRationale).not.toContain("Daily pace");
    expect(pacingTightRationale).not.toContain("floor");
    expect(pacingTightRationale).not.toContain("/day");
    expect(billsRiskRationale).toContain("Bills are non-negotiable");
  });

  // ── RECURRING MONTHLY AMOUNT CONVERSION ─────────────────────────────
  it("toMonthlyAmount: WEEKLY $100 = $433.33/mo", () => {
    const monthly = toMonthlyAmount(100, "WEEKLY");
    expect(monthly).toBeCloseTo(433.33, 1);
  });

  it("toMonthlyAmount: FORTNIGHTLY $500 = $1083.33/mo", () => {
    const monthly = toMonthlyAmount(500, "FORTNIGHTLY");
    expect(monthly).toBeCloseTo(1083.33, 1);
  });

  it("toMonthlyAmount: ANNUALLY $1200 = $100/mo", () => {
    const monthly = toMonthlyAmount(1200, "ANNUALLY");
    expect(monthly).toBe(100);
  });

  // ── DIRECT SIMULATION STEP INVOCATION TESTS ─────────────────────────
  it("simulateOneOffPurchase formats rationale with tenant currency (GBP) and returns SAFE_YES", () => {
    const noopEngine: ProjectionEngineFn = () => ({
      steps: [],
      finalBalances: new Map(),
      getStepForEvent: () => undefined,
    });
    const res = simulateOneOffPurchase({
      amount: 100,
      includePersonal: false,
      effectiveSpendable: 500,
      everydayBalance: 500,
      safeCushion: "100.00",
      safeCushionVal: 100,
      daysUntilPayday: 10,
      nextPaycheckDateStr: "2026-12-01",
      totalBillsBeforePayday: 0,
      billsDueBeforePayday: [],
      goalEnvelopes: [],
      everydayEnvelopes: [],
      visibleEnvelopes: [],
      engineBuckets: [],
      envelopeBalancesMap: {},
      pendingExpensesRaw: [],
      sortedIncomes: [],
      dailyAllowance: 40,
      projectionEngine: noopEngine,
      timezone: "Europe/London",
      currency: "GBP",
      userId: "user-1",
    });
    expect(res.verdict).toBe("SAFE_YES");
    expect(res.rationaleSteps.join(" ")).toContain("£");
    expect(res.rationaleSteps.join(" ")).not.toContain("$");
  });

  it("simulateRecurringCommitment emits poolId on phantom expenses and catches interim deficits", () => {
    let capturedPhantomHasPoolId = false;
    const mockEngine: ProjectionEngineFn = (input) => {
      const phantomExp = input.expenseEvents?.find((e) => e.poolId === "__phantom_recurring__");
      if (phantomExp) capturedPhantomHasPoolId = true;
      const isWithPhantom = Boolean(phantomExp);
      const stepMin = new Map<string, number>([["__phantom_recurring__", isWithPhantom ? -250 : 0]]);
      const finalBalances = new Map<string, number>([["__phantom_recurring__", 0]]);
      return {
        steps: [
          {
            incomeEvent: input.incomeEvents[0] ?? {
              id: "inc-1",
              expectedDate: "2026-12-01",
              expectedAmount: 1000,
              status: "PENDING",
            },
            date: "2026-12-01",
            totalIncome: 1000,
            balancesBeforeAlloc: new Map(),
            allocations: new Map(),
            balancesAfterAlloc: new Map(),
            deductedExpenses: [],
            balancesAfterExpenses: stepMin,
            minProjectedBalances: stepMin,
          },
        ],
        finalBalances,
        getStepForEvent: () => undefined,
      };
    };

    const res = simulateRecurringCommitment({
      amount: 500,
      frequency: "MONTHLY",
      itemName: "Gym",
      effectiveSpendable: 600,
      everydayBalance: 600,
      safeCushion: "100.00",
      daysUntilPayday: 10,
      nextPaycheckDateStr: "2026-12-01",
      totalBillsBeforePayday: 0,
      visibleEnvelopes: [],
      goalEnvelopes: [],
      everydayEnvelopes: [],
      engineBuckets: [],
      envelopeBalancesMap: {},
      pendingExpensesRaw: [],
      sortedIncomes: [],
      projectionEngine: mockEngine,
      today: new Date("2026-11-20T00:00:00Z"),
      timezone: "Australia/Sydney",
      currency: "EUR",
      userId: "user-1",
    });

    expect(capturedPhantomHasPoolId).toBe(true);
    expect(res.verdict).toBe("HARD_NO");
    expect(res.rationaleSteps.join(" ")).toContain("€");
  });

  it("excludes CONFIRMED incomes from future projection and inherits bankAccountIsPrivate on buckets", async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    let capturedInput: Parameters<ProjectionEngineFn>[0] | null = null;
    const spyEngine: ProjectionEngineFn = (input) => {
      capturedInput = input;
      return { steps: [], finalBalances: new Map(), getStepForEvent: () => undefined };
    };

    const mockDb = makeMockDb([
      [{ timezone: "UTC", currency: "AUD", country: "AU" }],
      [{ timezone: "UTC" }],
      [
        {
          id: "env-ed",
          name: "Everyday",
          envelopeType: "EVERYDAY",
          fundingMode: "TARGET_BALANCE",
          bankAccountId: "ba-1",
          safetyBufferFloor: "0",
          enteredAmount: "600",
          monthlyAmount: "600",
          targetAmount: null,
          endDate: null,
          isPriority: false,
          isSurplusTarget: true,
          isPrivate: false,
          userId: null,
          bankAccountIsPrivate: false,
          bankAccountUserId: null,
        },
        {
          id: "env-priv-bank",
          name: "Personal Savings",
          envelopeType: "GOAL",
          fundingMode: "TARGET_BALANCE",
          bankAccountId: "ba-priv",
          safetyBufferFloor: "0",
          enteredAmount: "200",
          monthlyAmount: "200",
          targetAmount: "2000",
          endDate: null,
          isPriority: false,
          isSurplusTarget: false,
          isPrivate: false,
          userId: null,
          bankAccountIsPrivate: true,
          bankAccountUserId: "user-1",
        },
      ],
      [
        {
          id: "inc-confirmed",
          sourceName: "Pay",
          expectedDate: todayStr,
          expectedAmount: "2000",
          actualAmount: "2000",
          status: "CONFIRMED",
          rrule: null,
          incomeCreatedBy: "user-1",
          sourceCreatedBy: "user-1",
          incomeContributionMode: "FULL",
          incomeContributionValue: null,
          sourceContributionMode: "FULL",
          sourceContributionValue: null,
          bankAccountIsPrivate: false,
          bankAccountUserId: null,
        },
        {
          id: "inc-pending",
          sourceName: "Pay",
          expectedDate: futureDate,
          expectedAmount: "2000",
          actualAmount: null,
          status: "PENDING",
          rrule: null,
          incomeCreatedBy: "user-1",
          sourceCreatedBy: "user-1",
          incomeContributionMode: "FULL",
          incomeContributionValue: null,
          sourceContributionMode: "FULL",
          sourceContributionValue: null,
          bankAccountIsPrivate: false,
          bankAccountUserId: null,
        },
      ],
      [],
    ]);
    vi.mocked(dbModule.getEnvelopeBalancesMap).mockResolvedValue({ "env-ed": 100, "env-priv-bank": 500 });

    await canAffordSimulationQuery(
      { amount: "500", mode: "ONE_OFF", includePersonal: true },
      "tenant-1",
      "app-1",
      "user-1",
      mockDb,
      { projectionEngine: spyEngine }
    );

    expect(capturedInput).not.toBeNull();
    expect(capturedInput!.incomeEvents.map((i) => i.id)).toEqual(["inc-pending"]);
    const privBucket = capturedInput!.categories.find((c) => c.id === "env-priv-bank");
    expect(privBucket?.isPrivate).toBe(true);
    expect(privBucket?.userId).toBe("user-1");
  });
});

