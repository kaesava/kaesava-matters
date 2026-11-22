"use client";

import React from "react";

export interface TimeframeOption<T extends string = string> {
  value: T;
  label: string;
}

export interface TimeframeSelectorProps<T extends string = string> {
  options: readonly TimeframeOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * Generic segmented timeframe selector (e.g. 30D / 90D / 1Y).
 */
export function TimeframeSelector<T extends string = string>({
  options,
  value,
  onChange,
  className = "",
}: TimeframeSelectorProps<T>) {
  return (
    <div
      role="group"
      className={`inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
