import type { ArchivableEntityAdapter, ArchivableItemSummary } from "@kaesava/types";

export const CASCADE_ARCHIVE_WINDOW_MS = 2000;

export function getArchiveBatchWindow(archivedAt: Date | string): {
  windowStart: Date;
  windowEnd: Date;
} {
  const archivedTimeMs = new Date(archivedAt).getTime();
  return {
    windowStart: new Date(archivedTimeMs - CASCADE_ARCHIVE_WINDOW_MS),
    windowEnd: new Date(archivedTimeMs + CASCADE_ARCHIVE_WINDOW_MS),
  };
}

export function createArchiveRegistry<TDb>(
  adapters: readonly ArchivableEntityAdapter<TDb>[]
) {
  const adapterMap = new Map<string, ArchivableEntityAdapter<TDb>>();
  for (const adapter of adapters) {
    adapterMap.set(adapter.itemType, adapter);
  }

  return {
    async listArchivedItems(ctx: {
      db: TDb;
      tenantId: string;
      appId: string;
      userId?: string;
    }): Promise<ArchivableItemSummary[]> {
      const lists = await Promise.all(
        adapters.map((adapter) => adapter.listArchived(ctx))
      );
      return lists
        .flat()
        .sort(
          (a, b) =>
            new Date(b.archivedAt ?? 0).getTime() -
            new Date(a.archivedAt ?? 0).getTime()
        );
    },

    async restoreArchivedItem(
      ctx: { db: TDb; tenantId: string; appId: string; userId: string },
      itemType: string,
      itemId: string
    ): Promise<unknown> {
      const adapter = adapterMap.get(itemType);
      if (!adapter) {
        throw new Error(`Unsupported item type for restoration: ${itemType}`);
      }
      return adapter.restoreItem({ ...ctx, itemId });
    },
  };
}
