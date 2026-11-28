"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import type { ArchivedItemsProps } from "../ui-contracts.js";

export function ArchivedItemsSection({
  items,
  isLoading = false,
  isRestoringId = null,
  onRestore,
}: ArchivedItemsProps) {
  const [search, setSearch] = useState("");
  const filtered = items.filter((item) =>
    item.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("settings.tabs.archived")}</h2>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("settings.archived.searchPlaceholder")}
          className="h-10 rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
        />
      </div>
      {isLoading ? (
        <p className="text-sm text-slate-500">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.archived.emptyTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">{t("settings.archived.emptySubtitle")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {filtered.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.name}</p>
                <p className="text-xs text-slate-500">{item.subtitle || item.itemType}</p>
              </div>
              <button
                type="button"
                disabled={isRestoringId === item.id}
                onClick={() => onRestore(item)}
                className="h-9 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
              >
                {isRestoringId === item.id ? t("common.loading") : t("settings.archived.restoreAction")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
