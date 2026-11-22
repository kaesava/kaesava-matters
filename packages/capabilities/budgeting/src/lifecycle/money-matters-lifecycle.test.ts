import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db";
import { createMoneyMattersTenantLifecycleHooks } from "./money-matters-tenant-hooks.js";

describe("Money Matters Tenant Lifecycle Hooks", () => {
  it("onExportTenantData filters out partner private bank accounts, envelopes, ledger rows, and events", async () => {
    const responses = [
      [
        { id: "ba-shared", name: "Shared", isPrivate: false, userId: null },
        { id: "ba-alice", name: "Alice Private", isPrivate: true, userId: "user-1" },
        { id: "ba-bob", name: "Bob Private", isPrivate: true, userId: "user-2" },
      ],
      [
        { id: "env-shared", name: "Groceries", isPrivate: false, userId: null },
        { id: "env-bob", name: "Bob Secret", isPrivate: true, userId: "user-2" },
      ],
      [{ id: "inc-1", receivingAccountId: "ba-shared" }, { id: "inc-bob", receivingAccountId: "ba-bob" }],
      [{ id: "ie-1", incomeSourceId: "inc-1" }, { id: "ie-bob", incomeSourceId: "inc-bob" }],
      [{ id: "ee-1", envelopeId: "env-shared" }, { id: "ee-bob", envelopeId: "env-bob" }],
      [{ id: "tx-1", envelopeId: "env-shared", bankAccountId: "ba-shared", note: "=SUM(1,2)" }, { id: "tx-bob", envelopeId: "env-bob", bankAccountId: "ba-bob" }],
      [{ id: "ap-1", incomeEventId: "ie-1" }, { id: "ap-bob", incomeEventId: "ie-bob" }],
      [{ id: "apl-1", planId: "ap-1", envelopeId: "env-shared" }, { id: "apl-bob", planId: "ap-bob", envelopeId: "env-bob" }],
      [{ id: "te-1", sourceEnvelopeId: "env-shared", destinationEnvelopeId: "env-shared", name: "Transfer 1", expectedDate: "2026-01-01", expectedAmount: "50", status: "PENDING" }, { id: "te-bob", sourceEnvelopeId: "env-shared", destinationEnvelopeId: "env-bob", name: "Secret Transfer", expectedDate: "2026-01-01", expectedAmount: "20", status: "PENDING" }],
      [{ id: "st-1", name: "Household Balanced", presetKey: "BALANCED", isDefault: true, isPrivate: false, userId: null }, { id: "st-bob", name: "Bob Strategy", presetKey: "CUSTOM", isDefault: true, isPrivate: true, userId: "user-2" }],
      [{ id: "sts-1", strategyId: "st-1", orderIndex: 0, stepType: "IMMEDIATE_BILLS", targetEnvelopeId: null }, { id: "sts-bob", strategyId: "st-bob", orderIndex: 0, stepType: "IMMEDIATE_BILLS", targetEnvelopeId: null }],
      [{ id: "fn-1", entityType: "ENVELOPE", entityId: "env-shared", comment: "Receipt", fileName: "r.pdf", fileMimeType: "application/pdf", fileSize: "100", fileKey: "k-1", isPrivate: false, userId: "user-1", createdAt: new Date("2026-01-01") }, { id: "fn-bob", entityType: "ENVELOPE", entityId: "env-bob", comment: "Secret", fileName: null, fileMimeType: null, fileSize: null, fileKey: "k-bob", isPrivate: true, userId: "user-2", createdAt: new Date("2026-01-01") }],
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = responses[callIdx++] ?? [];
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue(rows),
        };
      }),
    } as unknown as DbOrTx;

    const presignMock = vi.fn().mockResolvedValue("https://signed.example.com/k-1");
    const hooks = createMoneyMattersTenantLifecycleHooks({ getPresignedDownloadUrl: presignMock });
    const csvFiles = await hooks.onExportTenantData!({
      db: mockDb,
      tenantId: "tenant-1",
      userId: "user-1",
      appId: "app-1",
    });

    expect(csvFiles["Bank_Accounts.csv"]).toContain("ba-shared");
    expect(csvFiles["Bank_Accounts.csv"]).toContain("ba-alice");
    expect(csvFiles["Bank_Accounts.csv"]).not.toContain("ba-bob");
    expect(csvFiles["Envelopes.csv"]).toContain("env-shared");
    expect(csvFiles["Envelopes.csv"]).not.toContain("env-bob");
    expect(csvFiles["File_Notes.csv"]).toContain("https://signed.example.com/k-1");
    expect(csvFiles["File_Notes.csv"]).not.toContain("fn-bob");
  });
});
