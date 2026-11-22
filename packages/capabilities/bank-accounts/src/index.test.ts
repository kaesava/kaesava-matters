import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db";
import {
  createBankAccountHandler,
  archiveBankAccountHandler,
  getBankAccountsWithMappingsHandler,
} from "./index.js";

describe("@kaesava/capability-bank-accounts", () => {
  const tenantId = "22222222-2222-4222-8222-222222222222";
  const appId = "01908bde-34bb-7b19-a178-574211bc93aa";
  const userId = "11111111-1111-4111-8111-111111111111";

  it("creates a standalone bank account without any budgeting hooks", async () => {
    const returningMock = vi.fn().mockResolvedValue([{ id: "acc-1", name: "Operating Account" }]);
    const insertMock = vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: returningMock }) });
    const mockDb = { insert: insertMock } as unknown as DbOrTx;

    const handler = createBankAccountHandler(mockDb);
    const res = await handler(
      {
        name: "Operating Account",
        bankProvider: "Other",
        accountType: "EVERYDAY",
        lastKnownBalance: "5000.00",
        unbudgetedBuffer: "0.00",
        isPrivate: false,
      },
      tenantId,
      appId,
      userId
    );
    expect(res.name).toBe("Operating Account");
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it("invokes validateBeforeArchive and onBankAccountArchived hooks during archival", async () => {
    const validateBeforeArchive = vi.fn().mockResolvedValue(undefined);
    const onBankAccountArchived = vi.fn().mockResolvedValue(undefined);

    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "acc-1", isPrivate: false, userId: null }]),
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: "acc-1" }]),
          }),
        }),
      }),
    } as unknown as DbOrTx;

    const handler = archiveBankAccountHandler(mockDb, {
      validateBeforeArchive,
      onBankAccountArchived,
    });
    const res = await handler("acc-1", tenantId, appId, userId);

    expect(res.success).toBe(true);
    expect(validateBeforeArchive).toHaveBeenCalledTimes(1);
    expect(onBankAccountArchived).toHaveBeenCalledTimes(1);
  });

  it("returns empty envelopes mapping when no onBankAccountsListed hook is supplied", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "acc-1", name: "Main" }]),
        }),
      }),
    } as unknown as DbOrTx;

    const handler = getBankAccountsWithMappingsHandler(mockDb);
    const res = await handler(tenantId, appId, userId);
    expect(res).toEqual([{ id: "acc-1", name: "Main", envelopes: [], poolTypes: [] }]);
  });
});
