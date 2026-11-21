import type { DbOrTx } from "@money-matters/db";
import type { ArchivableEntityAdapter } from "@money-matters/types";
import { createArchiveRegistry } from "@money-matters/core";
import { listArchivedItemsQuery } from "../queries/list-archived-items.query.js";
import { restoreItemCommand } from "../commands/restore-item.command.js";

function makeAdapter(itemType: "ENVELOPE" | "INCOME_SOURCE" | "BANK_ACCOUNT"): ArchivableEntityAdapter<DbOrTx> {
  return {
    itemType,
    async listArchived({ db, tenantId, appId, userId }) {
      const all = await listArchivedItemsQuery(tenantId, appId, db, userId);
      return all.filter((item) => item.itemType === itemType);
    },
    async restoreItem({ db, itemId, tenantId, appId, userId }) {
      return restoreItemCommand(itemId, itemType, tenantId, appId, userId, db);
    },
  };
}

export const moneyMattersArchiveAdapters: readonly ArchivableEntityAdapter<DbOrTx>[] = [
  makeAdapter("ENVELOPE"),
  makeAdapter("INCOME_SOURCE"),
  makeAdapter("BANK_ACCOUNT"),
];

export const moneyMattersArchiveRegistry = createArchiveRegistry(moneyMattersArchiveAdapters);
