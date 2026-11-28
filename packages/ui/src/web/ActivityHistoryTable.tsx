"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge } from "./Badge";
import { PaginationBar } from "./PaginationBar";
import { SkeletonTable } from "./SkeletonTable";

export interface ActivityHistoryItem {
  id: string;
  actorName: string;
  action: string;
  target?: string | null;
  summary?: string | null;
  timestamp: string;
  badgeVariant?: "primary" | "success" | "danger" | "warning";
}

export interface ActivityHistoryTableProps {
  items: readonly ActivityHistoryItem[];
  isLoading?: boolean;
  emptyMessage?: string;
  headers?: { actor?: string; action?: string; target?: string; timestamp?: string };
  formatTimestamp?: (iso: string) => string;
  onRowClick?: (item: ActivityHistoryItem) => void;
  page?: number;
  totalPages?: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function ActivityHistoryTable({
  items,
  isLoading = false,
  emptyMessage,
  headers,
  formatTimestamp = (iso) => iso,
  onRowClick,
  page = 1,
  totalPages = 1,
  totalItems = items.length,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
}: ActivityHistoryTableProps) {
  if (isLoading) return <SkeletonTable rows={5} cols={4} />;
  if (items.length === 0) {
    return (
      <div className="ui-card text-center py-8 text-sm text-slate-500">
        {emptyMessage ?? t("settings.workspace.dataExport.activityEmpty")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left font-bold">{headers?.actor ?? t("settings.workspace.dataExport.activityActor")}</th>
              <th className="px-4 py-3 text-left font-bold">{headers?.action ?? t("settings.workspace.dataExport.activityAction")}</th>
              <th className="px-4 py-3 text-left font-bold">{headers?.target ?? t("settings.workspace.dataExport.activityTarget")}</th>
              <th className="px-4 py-3 text-center font-bold">{headers?.timestamp ?? t("settings.workspace.dataExport.activityTimestamp")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={onRowClick ? "hover:bg-slate-50 cursor-pointer" : undefined}
              >
                <td className="px-4 py-3 text-left font-medium text-[#1B2B4B]">{item.actorName}</td>
                <td className="px-4 py-3 text-left"><Badge variant={item.badgeVariant ?? "primary"}>{item.action}</Badge></td>
                <td className="px-4 py-3 text-left text-slate-600">{item.summary || item.target || "—"}</td>
                <td className="px-4 py-3 text-center text-xs text-slate-500 whitespace-nowrap">{formatTimestamp(item.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalItems >= 5 && onPageChange && (
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
