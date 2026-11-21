import { describe, it, expect } from "vitest";
import { runCumulativeProjection, CumulativeProjectionIncomeEvent, CumulativeProjectionExpenseEvent } from "./cumulative-projection.js";
import { EngineBucket } from "./allocation-engine.js";

describe("cumulative-projection engine", () => {
  const mockCategories: EngineBucket[] = [
    {
      id: "pool-everyday",
      name: "Everyday Expenses",
      type: "EVERYDAY",
      monthlyAmount: 500,
      currentBalance: 200,
    },
    {
      id: "pool-bills",
      name: "Rent & Housing Bills",
      type: "BILL",
      isPriority: true,
      monthlyAmount: 1000,
      currentBalance: 100,
    },
    {
      id: "pool-surplus",
      name: "Offset Surplus Sweep",
      type: "GOAL",
      isSurplusTarget: true,
      currentBalance: 0,
    },
  ];

  const mockIncomeEvents: CumulativeProjectionIncomeEvent[] = [
    {
      id: "evt-1",
      sourceName: "Salary 1",
      expectedDate: "2026-09-01",
      expectedAmount: 2000,
      status: "PENDING",
    },
    {
      id: "evt-2",
      sourceName: "Salary 2",
      expectedDate: "2026-09-15",
      expectedAmount: 2000,
      status: "PENDING",
    },
  ];

  const mockExpenseEvents: CumulativeProjectionExpenseEvent[] = [
    {
      poolId: "pool-bills",
      amount: 800,
      dueDate: "2026-09-10",
      status: "PENDING",
    },
  ];

  it("should project cumulative timeline and deduct intermediate expenses between income events", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: mockIncomeEvents,
      expenseEvents: mockExpenseEvents,
    });

    expect(result.steps.length).toBe(2);

    // Step 1: Event 1 on 2026-09-01
    const step1 = result.steps[0];
    expect(step1.incomeEvent.id).toBe("evt-1");
    // Expense on 2026-09-10 is due before Event 2 (2026-09-15), so it gets deducted after Event 1 allocation
    expect(step1.deductedExpenses.length).toBe(1);
    expect(step1.deductedExpenses[0].amount).toBe(800);

    // Step 2: Event 2 on 2026-09-15
    const step2 = result.steps[1];
    expect(step2.incomeEvent.id).toBe("evt-2");
    // Starting balance for Event 2 reflects the deduction of the $800 bill
    const billsBalBeforeEvent2 = step2.balancesBeforeAlloc.get("pool-bills");
    expect(billsBalBeforeEvent2).toBeCloseTo(step1.balancesAfterExpenses.get("pool-bills")!, 2);
  });

  it("should sort same-day income events deterministically by id", () => {
    const sameDayIncomes: CumulativeProjectionIncomeEvent[] = [
      { id: "evt-b", expectedDate: "2026-09-01", expectedAmount: 1000, status: "PENDING" },
      { id: "evt-a", expectedDate: "2026-09-01", expectedAmount: 1500, status: "PENDING" },
    ];

    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: sameDayIncomes,
    });

    expect(result.steps[0].incomeEvent.id).toBe("evt-a");
    expect(result.steps[1].incomeEvent.id).toBe("evt-b");
  });

  it("should apply saved draft plans when present", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: mockIncomeEvents,
      savedPlans: {
        "evt-1": [
          { poolId: "pool-bills", proposedAmount: 1200, reasoning: "User custom draft" },
          { poolId: "pool-everyday", proposedAmount: 800 },
        ],
      },
    });

    const step1 = result.steps[0];
    expect(step1.allocations.get("pool-bills")?.proposedAmount).toBe(1200);
    expect(step1.allocations.get("pool-bills")?.isOverride).toBe(true);
  });

  it("should apply pro-rata burn to EVERYDAY pools without artificially capping sinking bills pools", () => {
    const result = runCumulativeProjection({
      categories: [
        {
          id: "pool-everyday",
          name: "Everyday Expenses",
          type: "EVERYDAY",
          monthlyAmount: 600, // $600/mo = $20/day
          currentBalance: 500,
        },
        {
          id: "pool-bills",
          name: "Rent & Housing Bills",
          type: "BILL",
          monthlyAmount: 1000,
          currentBalance: 1400,
        },
        {
          id: "pool-surplus",
          name: "Surplus Target",
          type: "GOAL",
          isSurplusTarget: true,
          currentBalance: 0,
        },
      ],
      incomeEvents: [
        { id: "evt-1", expectedDate: "2026-09-01", expectedAmount: 2000, status: "PENDING" },
        { id: "evt-2", expectedDate: "2026-09-15", expectedAmount: 2000, status: "PENDING" }, // 14-day gap ($280 burn)
      ],
    });

    const step1 = result.steps[0];
    // Everyday: $500 balance + $280 alloc (14 days gap) - $280 burn (14 days @ $20/day) = $500
    const everydayAfterExp = step1.balancesAfterExpenses.get("pool-everyday");
    expect(everydayAfterExp).toBeLessThan(500 + 280);

    // Bills: balance after alloc accumulates naturally without being artificially trimmed to 1.5x
    const billsAfterExp = step1.balancesAfterExpenses.get("pool-bills");
    expect(billsAfterExp).toBeGreaterThan(1500);
  });

  it("should preserve and accurately project confirmed income events with their cellOverrides", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: [
        { id: "evt-confirmed-1", expectedDate: "2026-08-15", expectedAmount: 2500, status: "CONFIRMED" },
        { id: "evt-pending-2", expectedDate: "2026-09-01", expectedAmount: 2500, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-confirmed-1_pool-bills": 1500,
        "evt-confirmed-1_pool-everyday": 1000,
      },
    });

    expect(result.steps.length).toBe(2);
    const confirmedStep = result.steps[0];
    expect(confirmedStep.incomeEvent.id).toBe("evt-confirmed-1");
    expect(confirmedStep.allocations.get("pool-bills")?.proposedAmount).toBe(1500);
    expect(confirmedStep.allocations.get("pool-bills")?.reasoning).toBe("Confirmed allocation plan");
    expect(confirmedStep.allocations.get("pool-everyday")?.proposedAmount).toBe(1000);
  });

  it("should preserve and accurately project pending income events with custom saved cellOverrides", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: [
        { id: "evt-pending-1", expectedDate: "2026-09-01", expectedAmount: 2500, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-pending-1_pool-bills": 1400,
        "evt-pending-1_pool-everyday": 1100,
      },
    });

    expect(result.steps.length).toBe(1);
    const draftStep = result.steps[0];
    expect(draftStep.incomeEvent.id).toBe("evt-pending-1");
    expect(draftStep.allocations.get("pool-bills")?.proposedAmount).toBe(1400);
    expect(draftStep.allocations.get("pool-bills")?.reasoning).toBe("Custom saved allocation plan");
    expect(draftStep.allocations.get("pool-bills")?.isOverride).toBe(true);
    expect(draftStep.allocations.get("pool-everyday")?.proposedAmount).toBe(1100);
  });

  it("should respect custom strategySteps and personalStrategySteps independently", () => {
    const result = runCumulativeProjection({
      currentUserId: "user-1",
      categories: [
        ...mockCategories,
        { id: "priv-goal", name: "Private Goal", type: "GOAL", targetAmount: 2000, monthlyAmount: 500, currentBalance: 0, isPrivate: true, userId: "user-1", isPriority: true },
        { id: "priv-everyday", name: "Private Spend", type: "EVERYDAY", monthlyAmount: 500, currentBalance: 0, isPrivate: true, userId: "user-1" },
      ],
      incomeEvents: [
        {
          id: "evt-split-1",
          expectedDate: "2026-09-01",
          expectedAmount: 1000,
          status: "PENDING",
          isPrivate: true,
          contributionMode: "PERCENTAGE",
          contributionValue: 50,
        },
      ],
      strategySteps: [
        { stepType: "EVERYDAY_ALLOWANCE" },
        { stepType: "STANDARD_BILLS" },
        { stepType: "SURPLUS_SWEEP" },
      ],
    });

    const step = result.steps[0];
    expect(step.allocations.get("priv-everyday")?.proposedAmount).toBe(500);
    expect(step.allocations.get("pool-everyday")?.proposedAmount).toBeGreaterThan(0);
  });

  it("should not inflate EVERYDAY balance up to safetyBufferFloor when balance is already below floor", () => {
    const result = runCumulativeProjection({
      categories: [
        {
          id: "pool-everyday",
          name: "Everyday Expenses",
          type: "EVERYDAY",
          monthlyAmount: 600,
          safetyBufferFloor: 500,
          currentBalance: 100,
        },
        {
          id: "pool-surplus",
          name: "Surplus Target",
          type: "GOAL",
          isSurplusTarget: true,
          currentBalance: 0,
        },
      ],
      incomeEvents: [
        { id: "evt-1", expectedDate: "2026-10-01", expectedAmount: 100, status: "PENDING" },
        { id: "evt-2", expectedDate: "2026-10-10", expectedAmount: 1000, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-1_pool-everyday": 0,
        "evt-1_pool-surplus": 100,
      },
    });

    // Balance was $100 (< $500 floor), so burn must not jump it up to $500
    expect(result.steps[0].balancesAfterExpenses.get("pool-everyday")).toBe(100);
    expect(result.steps[1].balancesBeforeAlloc.get("pool-everyday")).toBe(100);
  });

  it("should not deduct EVERYDAY burn between same-day paydays", () => {
    const result = runCumulativeProjection({
      categories: [
        {
          id: "pool-everyday",
          name: "Everyday Expenses",
          type: "EVERYDAY",
          monthlyAmount: 600,
          currentBalance: 500,
        },
        {
          id: "pool-surplus",
          name: "Surplus Target",
          type: "GOAL",
          isSurplusTarget: true,
          currentBalance: 0,
        },
      ],
      incomeEvents: [
        { id: "evt-a", expectedDate: "2026-10-05", expectedAmount: 500, status: "PENDING" },
        { id: "evt-b", expectedDate: "2026-10-05", expectedAmount: 500, status: "PENDING" },
        { id: "evt-c", expectedDate: "2026-10-10", expectedAmount: 500, status: "PENDING" },
      ],
      cellOverrides: {
        "evt-a_pool-everyday": 0,
        "evt-a_pool-surplus": 500,
      },
    });

    // Same-day evt-a -> evt-b has 0 burn days, so balance remains $500 before evt-b
    expect(result.steps[0].balancesAfterExpenses.get("pool-everyday")).toBe(500);
    expect(result.steps[1].balancesBeforeAlloc.get("pool-everyday")).toBe(500);
  });

  it("should chain unsaved payday, saved draft payday, intermediate expenses, and everyday burn into target payday", () => {
    const result = runCumulativeProjection({
      categories: mockCategories,
      incomeEvents: [
        { id: "oct-01", expectedDate: "2026-10-01", expectedAmount: 2000, status: "PENDING" },
        { id: "oct-05", expectedDate: "2026-10-05", expectedAmount: 2000, status: "PENDING" },
        { id: "oct-10", expectedDate: "2026-10-10", expectedAmount: 2000, status: "PENDING" },
      ],
      expenseEvents: [
        { poolId: "pool-bills", amount: 300, dueDate: "2026-10-07", status: "PENDING" },
      ],
      cellOverrides: {
        "oct-05_pool-bills": 700,
        "oct-05_pool-everyday": 300,
        "oct-05_pool-surplus": 1000,
      },
    });

    const stepOct01 = result.getStepForEvent("oct-01")!;
    const stepOct05 = result.getStepForEvent("oct-05")!;
    const stepOct10 = result.getStepForEvent("oct-10")!;

    expect(stepOct01.allocations.get("pool-bills")?.isOverride).toBe(false);
    expect(stepOct05.allocations.get("pool-bills")?.isOverride).toBe(true);
    expect(stepOct05.allocations.get("pool-bills")?.proposedAmount).toBe(700);
    expect(stepOct05.unallocatedAmount).toBe(0);
    // Oct 05 deducted $300 bill due Oct 07 before Oct 10
    expect(stepOct05.deductedExpenses).toHaveLength(1);
    expect(stepOct10.balancesBeforeAlloc.get("pool-bills")).toBeCloseTo(
      stepOct05.balancesAfterExpenses.get("pool-bills")!,
      2
    );
  });

  it("should apply personalStrategySteps to private funds even on shared-account income with contributionMode", () => {
    const result = runCumulativeProjection({
      currentUserId: "user-1",
      categories: [
        ...mockCategories,
        { id: "priv-bill", name: "Private Bill", type: "BILL", monthlyAmount: 260, currentBalance: 0, isPrivate: true, userId: "user-1" },
        { id: "priv-everyday", name: "Private Spend", type: "EVERYDAY", monthlyAmount: 260, currentBalance: 0, isPrivate: true, userId: "user-1" },
      ],
      incomeEvents: [
        {
          id: "evt-shared-split",
          expectedDate: "2026-09-01",
          expectedAmount: 1000,
          status: "PENDING",
          isPrivate: false,
          userId: "user-1",
          contributionMode: "PERCENTAGE",
          contributionValue: 50,
        },
      ],
      personalStrategySteps: [
        { stepType: "STANDARD_BILLS" },
        { stepType: "EVERYDAY_ALLOWANCE" },
        { stepType: "SURPLUS_SWEEP" },
      ],
    });

    const step = result.steps[0];
    // 50% of 1000 = 500 private: 120 to priv-bill (260 * 12/26), 120 to priv-everyday, 260 swept to priv-everyday = 380
    expect(step.allocations.get("priv-bill")?.proposedAmount).toBeCloseTo(120, 2);
    expect(step.allocations.get("priv-everyday")?.proposedAmount).toBeCloseTo(380, 2);
  });

  it("should not double-count CONFIRMED income allocations into carried-forward balances", () => {
    const result = runCumulativeProjection({
      categories: [
        { id: "pool-bills", name: "Bills", type: "BILL", monthlyAmount: 500, currentBalance: 800 },
        { id: "pool-surplus", name: "Surplus", type: "GOAL", isSurplusTarget: true, currentBalance: 200 },
      ],
      incomeEvents: [
        { id: "evt-confirmed", expectedDate: "2026-09-01", expectedAmount: 1000, status: "CONFIRMED" },
        { id: "evt-pending", expectedDate: "2026-09-15", expectedAmount: 1000, status: "PENDING" },
      ],
      savedPlans: {
        "evt-confirmed": [
          { poolId: "pool-bills", proposedAmount: 500 },
          { poolId: "pool-surplus", proposedAmount: 500 },
        ],
      },
    });

    const confirmedStep = result.getStepForEvent("evt-confirmed")!;
    const pendingStep = result.getStepForEvent("evt-pending")!;
    // Confirmed step displays its saved allocations, but does not re-add them to currentBalance (800 / 200)
    expect(confirmedStep.allocations.get("pool-bills")?.proposedAmount).toBe(500);
    expect(confirmedStep.balancesAfterAlloc.get("pool-bills")).toBe(800);
    expect(pendingStep.balancesBeforeAlloc.get("pool-bills")).toBe(800);
    expect(pendingStep.balancesBeforeAlloc.get("pool-surplus")).toBe(200);
  });
});
