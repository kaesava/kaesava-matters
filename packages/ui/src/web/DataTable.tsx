"use client";

import React from "react";
import { SearchInput } from "./SearchInput";
import { PaginationBar } from "./PaginationBar";
import { SkeletonTable } from "./SkeletonTable";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "center" | "right";
  render: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowKey: (row: T) => string;
  isLoading?: boolean;
  emptyMessage: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

const ALIGN_CLASS: Record<"left" | "center" | "right", string> = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  isLoading = false,
  emptyMessage,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  page = 1,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
}: DataTableProps<T>) {
  const totalItems = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pagedRows = onPageChange
    ? rows.slice((page - 1) * pageSize, page * pageSize)
    : rows;

  return (
    <div className="space-y-3">
      {onSearchChange && (
        <SearchInput
          value={searchQuery ?? ""}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
        />
      )}
      {isLoading ? (
        <SkeletonTable rows={5} cols={columns.length} />
      ) : pagedRows.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-500">{emptyMessage}</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${ALIGN_CLASS[col.align ?? "left"]}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRows.map((row) => (
                <tr key={rowKey(row)} className="hover:bg-slate-50/70 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 ${ALIGN_CLASS[col.align ?? "left"]}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {onPageChange && totalItems >= 5 && (
        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange ?? (() => {})}
        />
      )}
    </div>
  );
}
