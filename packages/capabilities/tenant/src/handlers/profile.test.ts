import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@money-matters/db";
import { isUserTelemetryGranted } from "./profile.js";

function createMockDb(rows: Array<{ telemetryConsent: string | null }>): DbOrTx {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { select } as unknown as DbOrTx;
}

describe("isUserTelemetryGranted", () => {
  it("returns true strictly when telemetryConsent is granted", async () => {
    const db = createMockDb([{ telemetryConsent: "granted" }]);
    await expect(isUserTelemetryGranted(db, "user-1")).resolves.toBe(true);
  });

  it("returns false when telemetryConsent is denied or null or missing", async () => {
    await expect(isUserTelemetryGranted(createMockDb([{ telemetryConsent: "denied" }]), "user-1")).resolves.toBe(false);
    await expect(isUserTelemetryGranted(createMockDb([{ telemetryConsent: null }]), "user-1")).resolves.toBe(false);
    await expect(isUserTelemetryGranted(createMockDb([]), "user-1")).resolves.toBe(false);
  });
});
