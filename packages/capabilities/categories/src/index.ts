import {
  CreateCategoryInputSchema,
  UpdateCategoryInputSchema,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CategoryRecord,
} from "@money-matters/types";

export interface CategoryStoreAdapter {
  listByTenant: (tenantId: string, appId: string) => Promise<CategoryRecord[]>;
  insert: (
    tenantId: string,
    appId: string,
    userId: string,
    input: CreateCategoryInput & { slug: string }
  ) => Promise<CategoryRecord>;
  update: (
    tenantId: string,
    appId: string,
    userId: string,
    input: UpdateCategoryInput
  ) => Promise<CategoryRecord | null>;
  archive: (
    tenantId: string,
    appId: string,
    userId: string,
    id: string
  ) => Promise<boolean>;
}

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function createCategoryCapability(store: CategoryStoreAdapter) {
  return {
    listCategories: (tenantId: string, appId: string) =>
      store.listByTenant(tenantId, appId),

    createCategory: async (
      tenantId: string,
      appId: string,
      userId: string,
      rawInput: CreateCategoryInput
    ) => {
      const parsed = CreateCategoryInputSchema.parse(rawInput);
      const slug = parsed.slug || slugifyCategoryName(parsed.name);
      return store.insert(tenantId, appId, userId, { ...parsed, slug });
    },

    updateCategory: async (
      tenantId: string,
      appId: string,
      userId: string,
      rawInput: UpdateCategoryInput
    ) => {
      const parsed = UpdateCategoryInputSchema.parse(rawInput);
      const updated = await store.update(tenantId, appId, userId, parsed);
      if (!updated) throw new Error("Category not found");
      return updated;
    },

    archiveCategory: async (
      tenantId: string,
      appId: string,
      userId: string,
      id: string
    ) => {
      const archived = await store.archive(tenantId, appId, userId, id);
      if (!archived) throw new Error("Category not found");
      return { archived: true as const, id };
    },
  };
}
