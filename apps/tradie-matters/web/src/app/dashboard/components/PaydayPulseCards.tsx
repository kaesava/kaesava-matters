"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { useLocale } from "../../../providers/LocaleProvider";

export interface PulseMetrics {
  dueReceivables: number;
  overdueReceivables: number;
  accruedWages: number;
  superContribution12Pct: number;
  netCashPosition: number;
}

export function PaydayPulseCards({ pulse }: { pulse: PulseMetrics }) {
  const { fmt } = useLocale();
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">{t("tradiePulse.weeklyPaydayPulse")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="ui-card p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.dueReceivables")}</span>
          <span className="font-mono tabular-nums text-lg font-extrabold text-slate-900 dark:text-slate-100">{fmt(pulse.dueReceivables)}</span>
        </div>
        <div className="ui-card p-4 border-red-200 dark:border-red-900">
          <span className="block text-xs text-red-500">{t("tradiePulse.overdueReceivables")}</span>
          <span className="font-mono tabular-nums text-lg font-extrabold text-red-600">{fmt(pulse.overdueReceivables)}</span>
        </div>
        <div className="ui-card p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.accruedCrewWages")}</span>
          <span className="font-mono tabular-nums text-lg font-extrabold text-slate-900 dark:text-slate-100">{fmt(pulse.accruedWages)}</span>
        </div>
        <div className="ui-card p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.superContribution")}</span>
          <span className="font-mono tabular-nums text-lg font-extrabold text-slate-900 dark:text-slate-100">{fmt(pulse.superContribution12Pct)}</span>
        </div>
        <div className="ui-card p-4 border-blue-200 dark:border-blue-900">
          <span className="block text-xs text-blue-600 dark:text-blue-400">{t("tradiePulse.netCashPulse")}</span>
          <span className={`font-mono tabular-nums text-lg font-extrabold ${pulse.netCashPosition >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600"}`}>
            {fmt(pulse.netCashPosition)}
          </span>
        </div>
      </div>
    </section>
  );
}
