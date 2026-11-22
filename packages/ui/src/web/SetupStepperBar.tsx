"use client";

import React from "react";

export interface SetupStepperBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onCancel?: () => void;
  cancelLabel?: string;
}

/**
 * Generic multi-step wizard header bar with progress indicator.
 */
export function SetupStepperBar({
  currentStep,
  totalSteps,
  stepTitle,
  onCancel,
  cancelLabel,
}: SetupStepperBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((currentStep / Math.max(1, totalSteps)) * 100)));
  return (
    <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>{stepTitle}</span>
            <span>
              {currentStep} / {totalSteps}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {onCancel && cancelLabel ? (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
