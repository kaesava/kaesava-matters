import { describe, it, expect } from "vitest";
import type { CategoryRecord } from "@money-matters/types";
import { createCategoryCapability, slugifyCategoryName, type CategoryStoreAdapter } from "./index.js";

function createInMemoryCategoryStore(): CategoryStoreAdapter {
  const rows: CategoryRecord[] = [];
  return {
    async listByTenant(tenantId, appId) {
      return rows
        .filter((r) => r.tenantId === tenantId && r.appId === appId && !r.archivedAt)
        .sort((a, b) => a.sortOrder - b.sortOrder);
    },
    async insert(tenantId, appId, _userId, input) {
      const now = new Date();
      const record: CategoryRecord = {
        id: crypto.randomUUID(),
        tenantId,
        appId,
        name: input.name,
        slug: input.slug,
        color: input.color ?? null,
        icon: input.icon ?? null,
        sortOrder: input.sortOrder ?? 0,
        metadata: input.metadata,
        createdAt: now,
        updatedAt: now,
        archivedAt: null,
      };
      rows.push(record);
      return record;
    },
    async update(tenantId, appId, _userId, input) {
      const target = rows.find(
        (r) => r.id === input.id && r.tenantId === tenantId && r.appId === appId && !r.archivedAt
      );
      if (!target) return null;
      if (input.name !== undefined) target.name = input.name;
      if (input.color !== undefined) target.color = input.color;
      if (input.icon !== undefined) target.icon = input.icon;
      if (input.sortOrder !== undefined) target.sortOrder = input.sortOrder;
      if (input.metadata !== undefined) target.metadata = input.metadata;
      target.updatedAt = new Date();
      return target;
    },
    async archive(tenantId, appId, _userId, id) {
      const target = rows.find(
        (r) => r.id === id && r.tenantId === tenantId && r.appId === appId && !r.archivedAt
      );
      if (!target) return false;
      target.archivedAt = new Date();
      return true;
    },
  };
}

describe("@money-matters/capability-categories", () => {
  it("slugifies category names deterministically", () => {
    expect(slugifyCategoryName("Emergency Plumbing & Gas!")).toBe("emergency-plumbing-gas");
  });

  it("supports tenant-isolated CRUD and soft-archival for TradiePro Job Tags", async () => {
    const cap = createCategoryCapability(createInMemoryCategoryStore());
    const appId = "01908bde-9999-7b19-a178-574211bc93ff";
    const tenantA = "00000000-0000-0000-0000-000000000001";
    const tenantB = "00000000-0000-0000-0000-000000000002";

    const plumbing = await cap.createCategory(tenantA, appId, "user-1", {
      name: "Plumbing",
      color: "#2563eb",
      sortOrder: 1,
    });
    expect(plumbing.slug).toBe("plumbing");

    await cap.createCategory(tenantB, appId, "user-2", {
      name: "Electrical",
      sortOrder: 0,
    });

    const tenantAList = await cap.listCategories(tenantA, appId);
    expect(tenantAList).toHaveLength(1);
    expect(tenantAList[0].name).toBe("Plumbing");

    const updated = await cap.updateCategory(tenantA, appId, "user-1", {
      id: plumbing.id,
      name: "Commercial Plumbing",
    });
    expect(updated.name).toBe("Commercial Plumbing");

    const archived = await cap.archiveCategory(tenantA, appId, "user-1", plumbing.id);
    expect(archived).toEqual({ archived: true, id: plumbing.id });
    expect(await cap.listCategories(tenantA, appId)).toHaveLength(0);
  });
});
