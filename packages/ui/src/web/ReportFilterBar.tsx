"use client";

import React from "react";

export interface ReportFilterBarProps {
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  className?: string;
}

/**
 * Generic report filter bar container.
 */
export function ReportFilterBar({ leftSlot, rightSlot, className = "" }: ReportFilterBarProps) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">{leftSlot}</div>
      {rightSlot ? <div className="flex flex-wrap items-center gap-2">{rightSlot}</div> : null}
    </div>
  );
}
