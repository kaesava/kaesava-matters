import { describe, it, expect } from "vitest";
import { getTotalSetupSteps, convertToMonthly, convertFromMonthly } from "./setup-steps.types.js";
import { simulateSetupPaydaySandbox } from "./setup-sandbox-simulation.js";

describe("Setup Steps Parity", () => {
  it("defines step counts for first-run (5) and rerun (3) setup", () => {
    expect(getTotalSetupSteps(false)).toBe(5);
    expect(getTotalSetupSteps(true)).toBe(3);
  });

  it("converts frequencies to and from monthly amounts symmetrically", () => {
    expect(convertToMonthly(1200, "MONTHLY")).toBe(1200);
    expect(convertFromMonthly(1200, "MONTHLY")).toBe(1200);
  });

  it("simulateSetupPaydaySandbox prorates waterfall allocations across regular bills, everyday, and goals", () => {
    const res = simulateSetupPaydaySandbox({
      paycheckAmount: 3000,
      incomes: [{ id: "1", name: "Salary", amount: 3000, frequency: "FORTNIGHTLY", type: "SALARY" }],
      activeEveryday: [{ name: "Everyday", type: "EVERYDAY", monthlyAud: 1300, icon: "🛒" }],
      activeRegular: [{ name: "Rent", type: "BILL", monthlyAud: 2600, icon: "📌", isPriority: true }],
      activeGoals: [{ name: "Emergency Reserve", type: "GOAL", monthlyAud: 650, icon: "🎯", isSurplusTarget: true }],
      goals: [{ id: "g1", name: "Emergency Reserve", monthlyAmount: 650, fundingMode: "RECURRING", isPriority: true, isSurplusTarget: true, icon: "🎯" }],
    });
    expect(res.billsAllocated + res.goalsAllocated + res.safeToSpend).toBeCloseTo(3000, 2);
    expect(res.billsAllocated).toBeGreaterThan(0);
    expect(res.safeToSpend).toBeGreaterThan(0);
    expect(res.goalsAllocated).toBeGreaterThan(0);
    expect(res.surplusTargetName).toBe("Emergency Reserve");
  });
});
