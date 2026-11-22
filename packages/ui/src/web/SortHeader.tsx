"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

export interface SortHeaderProps {
  label: string;
  field: string;
  activeField: string;
  direction: "asc" | "desc";
  onSort: (field: string) => void;
  align?: "left" | "center" | "right";
  className?: string;
}

/**
 * Canonical sortable table header (`<th>`) matching table alignment invariants.
 */
export function SortHeader({
  label,
  field,
  activeField,
  direction,
  onSort,
  align = "left",
  className = "",
}: SortHeaderProps) {
  const isActive = activeField === field;
  const alignClass =
    align === "right" ? "justify-end text-right" : align === "center" ? "justify-center text-center" : "justify-start text-left";

  return (
    <th
      aria-sort={isActive ? (direction === "asc" ? "ascending" : "descending") : "none"}
      className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex w-full items-center gap-1 hover:text-slate-800 dark:hover:text-slate-200 ${alignClass}`}
      >
        <span>{label}</span>
        {isActive ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </th>
  );
}
