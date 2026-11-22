import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db";
import { setSurplusTargetCommand } from "./set-surplus-target.command.js";
import { archiveEnvelopeCommand } from "./archive-envelope.command.js";

describe("setSurplusTargetCommand", () => {
  it("designates a shared BILL envelope as surplus target and syncs household SURPLUS_SWEEP step", async () => {
    const updatedCalls: Array<Record<string, unknown>> = [];

    const mockTx = {
      select: vi.fn().mockImplementation(() => ({
        from: vi.fn().mockImplementation(() => ({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  envelope: {
                    id: "env-bill-1",
                    name: "Council Rates",
                    envelopeType: "BILL",
                    isPrivate: false,
                    isSurplusTarget: false,
                  },
                  bankIsPrivate: false,
                },
              ]),
            }),
          }),
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: "strat-household" }]),
          }),
        })),
      })),
      update: vi.fn().mockImplementation(() => ({
        set: vi.fn().mockImplementation((payload: Record<string, unknown>) => {
          updatedCalls.push(payload);
          return {
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([
                { id: "env-bill-1", envelopeType: "BILL", isSurplusTarget: true },
              ]),
            }),
          };
        }),
      })),
    };

    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    const res = await setSurplusTargetCommand(
      "env-bill-1",
      "tenant-1",
      "app-1",
      "user-1",
      mockDb as unknown as DbOrTx
    );

    expect(res.isSurplusTarget).toBe(true);
    expect(updatedCalls.some((c) => c.isSurplusTarget === false)).toBe(true);
    expect(updatedCalls.some((c) => c.isSurplusTarget === true)).toBe(true);
    expect(updatedCalls.some((c) => c.targetEnvelopeId === "env-bill-1")).toBe(true);
  });

  it("rejects private envelopes", async () => {
    const mockTx = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  envelope: { id: "env-priv", isPrivate: true, isSurplusTarget: false },
                  bankIsPrivate: true,
                },
              ]),
            }),
          }),
        }),
      }),
    };
    const mockDb = {
      transaction: vi.fn().mockImplementation(async (cb: (tx: typeof mockTx) => Promise<unknown>) => cb(mockTx)),
    };

    await expect(
      setSurplusTargetCommand("env-priv", "tenant-1", "app-1", "user-1", mockDb as unknown as DbOrTx)
    ).rejects.toThrow("Only shared envelopes can be set as the Shortfall/Surplus target.");
  });

  it("blocks archiving any envelope marked isSurplusTarget", async () => {
    const mockDb = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                id: "env-bill-1",
                envelopeType: "BILL",
                isSurplusTarget: true,
                isPrivate: false,
                userId: null,
                bankAccountIsPrivate: false,
                bankAccountUserId: null,
              },
            ]),
          }),
        }),
      }),
    };

    await expect(
      archiveEnvelopeCommand("env-bill-1", "tenant-1", "app-1", "user-1", mockDb as unknown as DbOrTx)
    ).rejects.toThrow("Cannot archive an envelope designated as the household Surplus Sweep Target");
  });
});
