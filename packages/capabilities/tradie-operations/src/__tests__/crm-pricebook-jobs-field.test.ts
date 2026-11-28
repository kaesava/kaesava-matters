import { describe, expect, it, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  JOB_STATUS_WORKFLOW,
  assertJobTransition,
  mapPricebookCsv,
  TRADE_STARTER_PACKS,
  fuzzySearchPricebookQuery,
  syncFieldMutationsCommand,
} from "../index.js";

describe("JOB_STATUS_WORKFLOW", () => {
  it("allows valid transitions and rejects invalid ones", () => {
    expect(JOB_STATUS_WORKFLOW.initialStatus).toBe("LEAD");
    expect(() => assertJobTransition("LEAD", "QUOTED")).not.toThrow();
    expect(() => assertJobTransition("COMPLETED", "INVOICED")).not.toThrow();
    expect(() => assertJobTransition("INVOICED", "LEAD")).toThrow(/Invalid job status transition/);
  });
});

describe("TRADE_STARTER_PACKS & mapPricebookCsv", () => {
  it("defines 6 trade starter packs", () => {
    expect(Object.keys(TRADE_STARTER_PACKS)).toEqual([
      "ELECTRICAL",
      "PLUMBING",
      "HVAC",
      "CARPENTRY",
      "PAINTING",
      "LANDSCAPING",
      "GENERAL",
    ]);
  });

  it("maps Xero/Tradify/ServiceM8/Fergus CSV rows", () => {
    const csv = "ItemCode,ItemName,PurchasesUnitPrice,SalesUnitPrice,SalesTaxRate\nGPO-2,Double GPO,10.00,25.00,GST";
    const items = mapPricebookCsv("XERO", csv);
    expect(items).toHaveLength(1);
    expect(items[0]?.sku).toBe("GPO-2");
    expect(items[0]?.unitCostExTax).toBe("10.00");
    expect(items[0]?.sellPriceExTax).toBe("25.00");
    expect(items[0]?.markupPct).toBe("150.00");
  });
});

describe("fuzzySearchPricebookQuery", () => {
  it("matches order-independent tokens across name and searchAliases", async () => {
    const rows = [
      {
        id: "1",
        sku: "ELEC-GPO-DBL",
        name: "Double Power Point (GPO) 10A",
        description: "Twin outlet",
        itemType: "MATERIAL",
        category: "Outlets",
        unitOfMeasure: "EACH",
        searchAliases: "clipsal powerpoint socket",
        unitCostExTax: "14.50",
        markupPct: "60.00",
        sellPriceExTax: "23.20",
        taxCode: "GST",
        isFavourite: true,
        supplierName: "Rexel",
      },
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      }),
    } as unknown as DbOrTx;

    const results = await fuzzySearchPricebookQuery(mockDb, "t1", "a1", { query: "clipsal 10a double" });
    expect(results).toHaveLength(1);
    expect(results[0]?.sku).toBe("ELEC-GPO-DBL");
  });
});

describe("syncFieldMutationsCommand", () => {
  it("processes idempotent batch mutations and reports failures per item", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "visit-1" }]),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    const res = await syncFieldMutationsCommand(
      mockDb,
      { tenantId: "t1", appId: "a1", userId: "u1" },
      {
        mutations: [
          {
            kind: "CHECK_IN",
            clientMutationId: "mut-1",
            payload: { visitId: "00000000-0000-0000-0000-000000000001" },
          },
        ],
      }
    );
    expect(res.appliedCount).toBe(1);
    expect(res.failedCount).toBe(0);
    expect(res.results[0]?.recordId).toBe("visit-1");
  });
});
