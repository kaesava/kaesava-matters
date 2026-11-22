import { describe, it, expect } from "vitest";
import {
  createGenericLedgerCapability,
  type GenericLedgerEntry,
  type GenericLedgerStoreAdapter,
} from "./generic-ledger.js";

describe("Ring 2 Generic Ledger Capability", () => {
  it("records TradieMatters job charges/payments, computes net balance, and exports CSV", async () => {
    const rows: GenericLedgerEntry[] = [];
    const store: GenericLedgerStoreAdapter = {
      async insert(tenantId, appId, _userId, input) {
        const entry: GenericLedgerEntry = {
          id: crypto.randomUUID(),
          tenantId,
          appId,
          entityType: input.entityType,
          entityId: input.entityId,
          direction: input.direction,
          amountCents: input.amountCents,
          currency: input.currency,
          occurredAt: input.occurredAt,
          description: input.description ?? null,
          transferGroupId: input.transferGroupId ?? null,
          metadata: input.metadata,
          createdAt: new Date(),
          archivedAt: null,
        };
        rows.push(entry);
        return entry;
      },
      async list(tenantId, appId, filter) {
        return rows.filter(
          (r) =>
            r.tenantId === tenantId &&
            r.appId === appId &&
            !r.archivedAt &&
            (!filter?.entityType || r.entityType === filter.entityType) &&
            (!filter?.entityId || r.entityId === filter.entityId)
        );
      },
    };

    const ledger = createGenericLedgerCapability(store);
    const tenantId = "00000000-0000-0000-0000-000000000001";
    const appId = "01908bde-9999-7b19-a178-574211bc93ff";
    const jobId = "00000000-0000-0000-0000-000000000099";

    await ledger.recordEntry(tenantId, appId, "tradie-1", {
      entityType: "JOB",
      entityId: jobId,
      direction: "CREDIT",
      amountCents: 45000,
      currency: "AUD",
      occurredAt: "2026-03-10",
      description: "Customer invoice paid",
    });

    await ledger.recordEntry(tenantId, appId, "tradie-1", {
      entityType: "JOB",
      entityId: jobId,
      direction: "DEBIT",
      amountCents: 12000,
      currency: "AUD",
      occurredAt: "2026-03-10",
      description: "Copper piping materials",
    });

    const net = await ledger.computeNetBalanceCents(tenantId, appId, {
      entityType: "JOB",
      entityId: jobId,
    });
    expect(net).toBe(33000);

    const csv = await ledger.exportCsv(tenantId, appId, { entityType: "JOB", entityId: jobId });
    expect(csv).toContain("Customer invoice paid");
    expect(csv).toContain("450.00");
  });
});
