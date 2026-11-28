import { describe, expect, it, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import {
  TRADE_STARTER_PACKS,
  approveVariationCommand,
  checkInVisitCommand,
  checkOutVisitCommand,
  createVariationCommand,
  fuzzySearchPricebookQuery,
  importPricebookCsvCommand,
  installStarterPackCommand,
  mapPricebookCsv,
  syncFieldMutationsCommand,
} from "../index.js";

const ACTOR = { tenantId: "t1", appId: "a1", userId: "u1" };
const UUID_1 = "00000000-0000-0000-0000-000000000001";
const UUID_2 = "00000000-0000-0000-0000-000000000002";
const UUID_3 = "00000000-0000-0000-0000-000000000003";

function makePricebookRow(overrides: Record<string, unknown>) {
  return {
    id: "pb-1",
    sku: "SKU-1",
    name: "Item",
    description: null,
    itemType: "MATERIAL",
    category: "General",
    unitOfMeasure: "EACH",
    searchAliases: null,
    unitCostExTax: "10.00",
    markupPct: "50.00",
    sellPriceExTax: "15.00",
    taxCode: "GST",
    isFavourite: false,
    supplierName: null,
    ...overrides,
  };
}

describe("fuzzySearchPricebookQuery (ranking, subsequence & filters)", () => {
  it("supports subsequence matching for >=3 char tokens and rejects <3 char non-substrings", async () => {
    const rows = [
      makePricebookRow({ id: "1", name: "Clipsal Switch", sku: "CLIP-1", isFavourite: false }),
      makePricebookRow({ id: "2", name: "Alpha Conduit", sku: "ALP-1", isFavourite: true }),
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      }),
    } as unknown as DbOrTx;

    const subseqMatch = await fuzzySearchPricebookQuery(mockDb, "t1", "a1", { query: "clps" });
    expect(subseqMatch.map((r) => r.id)).toEqual(["1"]);

    const shortMiss = await fuzzySearchPricebookQuery(mockDb, "t1", "a1", { query: "xz" });
    expect(shortMiss).toEqual([]);
  });

  it("ranks favourites and name hits above alias/description hits and enforces limit", async () => {
    const rows = [
      makePricebookRow({ id: "alias", name: "Outlet Box", searchAliases: "copper" }),
      makePricebookRow({ id: "name", name: "Copper Pipe 15mm", isFavourite: false }),
      makePricebookRow({ id: "fav", name: "Copper Elbow", isFavourite: true }),
    ];
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(rows),
        }),
      }),
    } as unknown as DbOrTx;

    const ranked = await fuzzySearchPricebookQuery(mockDb, "t1", "a1", {
      query: "copper",
      limit: 2,
    });
    expect(ranked.map((r) => r.id)).toEqual(["fav", "name"]);
  });
});

describe("starter packs & CSV import mappers", () => {
  it("installs a starter pack via batch insert with audit fields", async () => {
    const valuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue(
        TRADE_STARTER_PACKS.PLUMBING.items.map((item, idx) => ({ id: `pb-${idx}`, ...item }))
      ),
    });
    const mockDb = {
      insert: vi.fn().mockReturnValue({ values: valuesSpy }),
    } as unknown as DbOrTx;

    const res = await installStarterPackCommand(mockDb, ACTOR, "PLUMBING");
    expect(res.packKey).toBe("PLUMBING");
    expect(res.insertedCount).toBe(TRADE_STARTER_PACKS.PLUMBING.items.length);
    expect(valuesSpy).toHaveBeenCalledTimes(1);
  });

  it("parses quoted CSV fields, labour detection, tax codes, and skips insert on empty CSV", async () => {
    const csv = [
      'Code,Name,CostPrice,SellPrice,TaxCode,Unit',
      '"LAB-01","Apprentice Labour, On-Site",0.00,95.00,GST_FREE,HOUR',
      '"MAT-01","""Heavy"" Bracket",12.50,25.00,EXEMPT,EACH',
    ].join("\r\n");

    const mapped = mapPricebookCsv("TRADIFY", csv);
    expect(mapped).toHaveLength(2);
    expect(mapped[0]).toMatchObject({
      sku: "LAB-01",
      name: "Apprentice Labour, On-Site",
      itemType: "LABOUR",
      taxCode: "GST_FREE",
      unitOfMeasure: "HOUR",
      markupPct: "0.00",
    });
    expect(mapped[1]).toMatchObject({
      sku: "MAT-01",
      name: '"Heavy" Bracket',
      itemType: "MATERIAL",
      taxCode: "EXEMPT",
      markupPct: "100.00",
    });

    const insertSpy = vi.fn();
    const emptyDb = { insert: insertSpy } as unknown as DbOrTx;
    const emptyRes = await importPricebookCsvCommand(emptyDb, ACTOR, "SERVICEM8", "Name,Price");
    expect(emptyRes.importedCount).toBe(0);
    expect(insertSpy).not.toHaveBeenCalled();
  });
});

describe("GPS timer rate snapshots", () => {
  it("snapshots member cost/charge rates and falls back to business default charge rate", async () => {
    const selectQueue = [
      [{ cost: "55.00", charge: null }],
      [{ defaultCharge: "125.00" }],
    ];
    const insertValuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "te-1", hourlyCostSnapshot: "55.00", hourlyChargeSnapshot: "125.00" }]),
    });
    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue(selectQueue.shift() ?? []),
          }),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: UUID_1,
                jobId: UUID_2,
                actualCheckInAt: new Date("2026-11-28T09:00:00Z"),
                scheduledStart: new Date("2026-11-28T09:00:00Z"),
              },
            ]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({ values: insertValuesSpy }),
    } as unknown as DbOrTx;

    const out = await checkOutVisitCommand(mockDb, ACTOR, {
      visitId: UUID_1,
      timestamp: "2026-11-28T09:00:10Z",
      latitude: "-37.8136",
      longitude: "144.9631",
      isBillable: true,
    });

    expect(out.timeEntry?.hourlyCostSnapshot).toBe("55.00");
    expect(out.timeEntry?.hourlyChargeSnapshot).toBe("125.00");
    expect(insertValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        durationMinutes: 1,
        hourlyCostSnapshot: "55.00",
        hourlyChargeSnapshot: "125.00",
      })
    );
  });

  it("throws when check-in visit is missing", async () => {
    const mockDb = {
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    await expect(
      checkInVisitCommand(mockDb, ACTOR, { visitId: UUID_1, latitude: "-37.81", longitude: "144.96" })
    ).rejects.toThrow("Visit not found.");
  });
});

describe("variation creation & approval", () => {
  it("calculates GST only on GST lines and approves variation + flags unbilled extras", async () => {
    const selectQueue = [[{ taxPct: "10.00" }], [{ total: 2 }]];
    const variationValuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: UUID_3, variationNumber: "VAR-003" }]),
    });
    const lineValuesSpy = vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: "vl-1" }, { id: "vl-2" }]),
    });
    const insertQueue = [variationValuesSpy, lineValuesSpy];

    const createDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue(selectQueue[0]),
            then: (resolve: (v: unknown) => void) => resolve(selectQueue[1]),
          })),
        }),
      })),
      insert: vi.fn().mockImplementation(() => ({
        values: insertQueue.shift() ?? variationValuesSpy,
      })),
    } as unknown as DbOrTx;

    const created = await createVariationCommand(createDb, ACTOR, {
      jobId: UUID_2,
      title: "Extra switchboard circuit",
      lines: [
        { description: "RCBO", quantity: "2.00", unitCostExTax: "25.00", unitSellPriceExTax: "50.00", taxCode: "GST", sortOrder: 0 },
        { description: "Permit fee", quantity: "1.00", unitCostExTax: "20.00", unitSellPriceExTax: "20.00", taxCode: "GST_FREE", sortOrder: 1 },
      ],
    });

    expect(created.variation.variationNumber).toBe("VAR-003");
    expect(variationValuesSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        totalExTax: "120.00",
        totalTax: "10.00",
        totalIncTax: "130.00",
      })
    );

    const jobSetSpy = vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue([]),
    });
    const approveQueue = [
      vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: UUID_3, jobId: UUID_2, status: "APPROVED" }]),
        }),
      }),
      jobSetSpy,
    ];
    const approveDb = {
      update: vi.fn().mockImplementation(() => ({
        set: approveQueue.shift() ?? jobSetSpy,
      })),
    } as unknown as DbOrTx;

    const approved = await approveVariationCommand(approveDb, ACTOR, {
      variationId: UUID_3,
      approvedByName: "Jane Customer",
    });
    expect(approved.status).toBe("APPROVED");
    expect(jobSetSpy).toHaveBeenCalledWith(expect.objectContaining({ hasUnbilledExtras: true }));
  });
});

describe("syncFieldMutationsCommand (idempotency & partial failure isolation)", () => {
  it("handles idempotent CHECK_OUT, LOG_MATERIAL, ATTACH_PHOTO and isolates errors", async () => {
    const limitFn = vi
      .fn()
      .mockResolvedValueOnce([{ id: "dup-te-1" }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "dup-mat-1" }]);

    const mockDb = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: limitFn,
          }),
        }),
      })),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: "photo-1" }]),
        }),
      }),
    } as unknown as DbOrTx;

    const res = await syncFieldMutationsCommand(mockDb, ACTOR, {
      mutations: [
        {
          kind: "CHECK_OUT",
          clientMutationId: "mut-out-1",
          payload: { visitId: UUID_1, isBillable: true },
        },
        {
          kind: "CHECK_IN",
          clientMutationId: "mut-in-missing",
          payload: { visitId: UUID_1 },
        },
        {
          kind: "LOG_MATERIAL",
          clientMutationId: "mut-mat-1",
          payload: {
            jobId: UUID_2,
            description: "Copper elbow",
            quantity: "2.00",
            taxCode: "GST",
            isBillable: true,
          },
        },
        {
          kind: "ATTACH_PHOTO",
          clientMutationId: "mut-photo-1",
          payload: {
            jobId: UUID_2,
            fileNoteId: UUID_3,
            photoCategory: "AFTER",
            visibility: "CUSTOMER_PORTAL",
          },
        },
      ],
    });

    expect(res.appliedCount).toBe(3);
    expect(res.failedCount).toBe(1);
    expect(res.results[0]).toEqual({ clientMutationId: "mut-out-1", status: "APPLIED", recordId: "dup-te-1" });
    expect(res.results[1]).toMatchObject({ clientMutationId: "mut-in-missing", status: "FAILED", recordId: null, error: "Visit not found." });
    expect(res.results[2]).toEqual({ clientMutationId: "mut-mat-1", status: "APPLIED", recordId: "dup-mat-1" });
    expect(res.results[3]).toEqual({ clientMutationId: "mut-photo-1", status: "APPLIED", recordId: "photo-1" });
  });
});
