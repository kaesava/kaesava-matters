"use client";

import React from "react";

export interface HeroMetricCardProps {
  title: string;
  primaryValue: React.ReactNode;
  subtitle?: React.ReactNode;
  visualSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
  className?: string;
}

/**
 * Generic home screen hero KPI card container.
 */
export function HeroMetricCard({
  title,
  primaryValue,
  subtitle,
  visualSlot,
  actionSlot,
  className = "",
}: HeroMetricCardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-1 font-mono text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {primaryValue}
          </div>
          {subtitle ? (
            <div className="mt-1.5 text-sm text-slate-600 dark:text-slate-300">{subtitle}</div>
          ) : null}
        </div>
        {visualSlot ? <div className="shrink-0">{visualSlot}</div> : null}
      </div>
      {actionSlot ? <div className="mt-4">{actionSlot}</div> : null}
    </div>
  );
}
