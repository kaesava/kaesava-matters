import { describe, it, expect, vi } from "vitest";
import type { DbOrTx } from "@kaesava/db";
import { exportDataHandler } from "./export-data.js";

describe("exportDataHandler", () => {
  it("exports core profile CSVs and merges domain CSVs returned by onExportTenantData hook", async () => {
    const responses = [
      [{ id: "user-1", email: "alice@example.com", displayName: "Alice" }],
      [{ id: "tenant-1", name: "Acme Co", timezone: "Australia/Melbourne" }],
    ];

    let callIdx = 0;
    const mockDb = {
      select: vi.fn().mockImplementation(() => {
        const rows = responses[callIdx++] ?? [];
        return {
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue(rows),
          })),
        };
      }),
    };

    const onExportTenantData = vi.fn().mockResolvedValue({
      "Jobs.csv": "id,title\njob-1,Fix Roof",
    });

    const handler = exportDataHandler(mockDb as unknown as DbOrTx, undefined, {
      onExportTenantData,
    });
    const result = await handler("tenant-1", "user-1", "app-1");

    expect(result.csvFiles["User_Profile.csv"]).toContain("alice@example.com");
    expect(result.csvFiles["Household_Profile.csv"]).toContain("Acme Co");
    expect(result.csvFiles["Jobs.csv"]).toContain("Fix Roof");
    expect(onExportTenantData).toHaveBeenCalledTimes(1);
  });
});
