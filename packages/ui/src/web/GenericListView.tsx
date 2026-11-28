"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { PaginationBar } from "./PaginationBar";
import { SearchInput } from "./SearchInput";
import { SkeletonTable } from "./SkeletonTable";

export interface GenericListColumn<TItem> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  render: (item: TItem) => React.ReactNode;
}

export interface GenericListViewProps<TItem extends { id: string }> {
  items: readonly TItem[];
  columns: readonly GenericListColumn<TItem>[];
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  emptyMessage?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  toolbarActions?: React.ReactNode;
  onRowClick?: (item: TItem) => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

const ALIGN_CLS = { left: "text-left", center: "text-center", right: "text-right" } as const;

export function GenericListView<TItem extends { id: string }>({
  items, columns, isLoading = false, emptyState, emptyMessage, searchValue, onSearchChange,
  searchPlaceholder, toolbarActions, onRowClick, page = 1, totalPages = 1,
  totalItems = items.length, pageSize = 20, onPageChange, onPageSizeChange,
}: GenericListViewProps<TItem>) {
  return (
    <div className="space-y-4">
      {(onSearchChange || toolbarActions) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {onSearchChange ? (
            <SearchInput value={searchValue ?? ""} onChange={onSearchChange} placeholder={searchPlaceholder ?? t("common.searchPlaceholder")} className="max-w-sm" />
          ) : <div />}
          {toolbarActions ? <div className="flex items-center gap-2">{toolbarActions}</div> : null}
        </div>
      )}
      {isLoading ? (
        <SkeletonTable rows={5} cols={Math.max(columns.length, 1)} />
      ) : items.length === 0 ? (
        emptyState ?? <div className="ui-card text-center py-10 text-sm text-slate-500">{emptyMessage ?? t("common.emptySubtitle")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                {columns.map((col) => (
                  <th key={col.key} className={`px-4 py-3 font-bold ${ALIGN_CLS[col.align ?? "left"]} ${col.className ?? ""}`}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => (
                <tr key={item.id} onClick={onRowClick ? () => onRowClick(item) : undefined} className={onRowClick ? "hover:bg-slate-50 cursor-pointer" : undefined}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${ALIGN_CLS[col.align ?? "left"]} ${col.className ?? ""}`}>{col.render(item)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalItems >= 5 && onPageChange ? (
        <PaginationBar page={page} totalPages={totalPages} totalItems={totalItems} pageSize={pageSize} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange ?? (() => {})} />
      ) : null}
    </div>
  );
}
