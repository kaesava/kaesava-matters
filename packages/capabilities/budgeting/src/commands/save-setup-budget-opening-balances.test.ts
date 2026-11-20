import type { DbOrTx } from "@money-matters/db";
import { describe, it, expect, vi } from "vitest";
import { saveSetupBudgetHandler } from "./save-setup-budget.command";
import { transactionLedger, bankAccounts, envelopes, tenants } from "@money-matters/db";

vi.mock("@money-matters/db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@money-matters/db")>();
  return {
    ...actual,
    getEnvelopeBalancesMap: vi.fn().mockResolvedValue({}),
  };
});

describe("saveSetupBudgetHandler opening balance allocation", () => {
  const tenantId = "00000000-0000-0000-0000-000000000001";
  const appId = "00000000-0000-0000-0000-000000000002";
  const userId = "00000000-0000-0000-0000-000000000003";

  const createMockDb = (existing?: {
    accounts?: Record<string, unknown>[];
    envelopes?: Record<string, unknown>[];
    ledgerRows?: Record<string, unknown>[];
  }) => {
    const insertedLedger: Record<string, unknown>[] = [];
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation((table: unknown) => {
          const getData = () => {
            if (table === bankAccounts) return existing?.accounts || [];
            if (table === envelopes) return existing?.envelopes || [];
            if (table === transactionLedger) return existing?.ledgerRows || [];
            if (table === tenants) return [{ timezone: "Australia/Sydney" }];
            return [];
          };
          const queryResult = Object.assign(Promise.resolve(getData()), {}) as Promise<unknown> &
            Record<string, unknown>;
          queryResult.limit = vi.fn().mockImplementation(() => Promise.resolve(getData()));
          return {
            where: vi.fn().mockReturnValue(queryResult),
            limit: vi.fn().mockImplementation(() => Promise.resolve(getData())),
          };
        }),
      })),
      insert: vi.fn().mockImplementation((table: unknown) => ({
        values: vi.fn().mockImplementation((vals: unknown) => {
          const items = Array.isArray(vals) ? vals : [vals];
          if (table === transactionLedger) insertedLedger.push(...items);
          return Object.assign(Promise.resolve(vals), {
            onConflictDoNothing: vi.fn().mockResolvedValue(vals),
          });
        }),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation(() => ({
          where: vi.fn().mockResolvedValue([]),
        })),
      })),
      delete: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockResolvedValue([]),
      })),
    };
    const db = Object.assign(mockDb, {
      transaction: vi.fn().mockImplementation(async (cb: (tx: DbOrTx) => Promise<unknown>) =>
        cb(mockDb as unknown as DbOrTx)
      ),
    });
    return { db, insertedLedger };
  };

  it("allocates opening balance net of Safety Cushion for a single account into the surplus target envelope", async () => {
    const { db, insertedLedger } = createMockDb();
    const handler = saveSetupBudgetHandler(db as unknown as DbOrTx);

    await handler(
      {
        incomes: [
          {
            name: "Salary",
            type: "SALARY",
            amount: "3000.00",
            frequency: "MONTHLY",
            incomeType: "SALARIED",
          },
        ],
        bankAccounts: [
          {
            id: "acc-1",
            name: "Everyday",
            accountType: "EVERYDAY",
            lastKnownBalance: "5000.00",
            unbudgetedBuffer: "1000.00",
          },
        ],
        envelopes: [
          {
            bankAccountId: "acc-1",
            name: "Everyday",
            envelopeType: "EVERYDAY",
            fundingMode: "TARGET_BALANCE",
            monthlyAmount: "500.00",
            isSurplusTarget: true,
            isPrivate: false,
            orderIndex: 0,
          },
        ],
      },
      appId,
      userId,
      tenantId
    );

    expect(insertedLedger).toHaveLength(1);
    expect(insertedLedger[0]).toMatchObject({
      flowType: "CREDIT",
      transactionType: "OPENING_BALANCE",
      amount: "4000.00",
    });
  });

  it("allocates multi-account balances per linked bankAccountId and skips accounts without envelopes or with prior ledger history", async () => {
    const { db, insertedLedger } = createMockDb({
      accounts: [{ id: "existing-acc", name: "Old Checking" }],
      envelopes: [
        {
          id: "env-existing",
          name: "Everyday",
          envelopeType: "EVERYDAY",
          bankAccountId: "existing-acc",
          isSurplusTarget: true,
          isPrivate: false,
        },
      ],
      ledgerRows: [{ bankAccountId: "existing-acc" }],
    });
    const handler = saveSetupBudgetHandler(db as unknown as DbOrTx);

    await handler(
      {
        incomes: [
          {
            name: "Salary",
            type: "SALARY",
            amount: "3000.00",
            frequency: "MONTHLY",
            incomeType: "SALARIED",
          },
        ],
        bankAccounts: [
          {
            id: "existing-acc",
            name: "Old Checking",
            accountType: "EVERYDAY",
            lastKnownBalance: "2500.00",
            unbudgetedBuffer: "0.00",
          },
          {
            id: "acc-sav-1",
            name: "Savings 1",
            accountType: "SAVINGS",
            lastKnownBalance: "10000.00",
            unbudgetedBuffer: "0.00",
          },
          {
            id: "acc-sav-2",
            name: "Savings 2",
            accountType: "SAVINGS",
            lastKnownBalance: "3000.00",
            unbudgetedBuffer: "0.00",
          },
          {
            id: "acc-priv",
            name: "Private Account",
            accountType: "EVERYDAY",
            lastKnownBalance: "800.00",
            unbudgetedBuffer: "0.00",
            isPrivate: true,
          },
        ],
        envelopes: [
          {
            id: "env-existing",
            bankAccountId: "existing-acc",
            name: "Everyday",
            envelopeType: "EVERYDAY",
            fundingMode: "TARGET_BALANCE",
            monthlyAmount: "500.00",
            isSurplusTarget: true,
            isPrivate: false,
            orderIndex: 0,
          },
          {
            bankAccountId: "acc-sav-1",
            name: "Emergency Fund",
            envelopeType: "GOAL",
            fundingMode: "TARGET_BALANCE",
            targetAmount: "15000.00",
            monthlyAmount: "500.00",
            isSurplusTarget: false,
            isPrivate: false,
            orderIndex: 1,
          },
        ],
      },
      appId,
      userId,
      tenantId
    );

    expect(insertedLedger).toHaveLength(1);
    expect(insertedLedger[0]).toMatchObject({
      transactionType: "OPENING_BALANCE",
      amount: "10000.00",
    });
  });
});
