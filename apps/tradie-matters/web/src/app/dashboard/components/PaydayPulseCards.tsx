"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { formatCurrency, useCurrencyLocale } from "@kaesava/ui/web";

export interface PulseMetrics {
  dueReceivables: number;
  overdueReceivables: number;
  accruedWages: number;
  superContribution12Pct: number;
  netCashPosition: number;
}

export function PaydayPulseCards({ pulse }: { pulse: PulseMetrics }) {
  const { currency, locale } = useCurrencyLocale();
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradiePulse.weeklyPaydayPulse")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.dueReceivables")}</span>
          <span className="font-mono text-lg font-extrabold text-[#1B2B4B]">{formatCurrency(pulse.dueReceivables, currency, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-red-200 p-4">
          <span className="block text-xs text-red-500">{t("tradiePulse.overdueReceivables")}</span>
          <span className="font-mono text-lg font-extrabold text-red-600">{formatCurrency(pulse.overdueReceivables, currency, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.accruedCrewWages")}</span>
          <span className="font-mono text-lg font-extrabold text-[#1B2B4B]">{formatCurrency(pulse.accruedWages, currency, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <span className="block text-xs text-slate-400">{t("tradiePulse.superContribution")}</span>
          <span className="font-mono text-lg font-extrabold text-[#1B2B4B]">{formatCurrency(pulse.superContribution12Pct, currency, locale)}</span>
        </div>
        <div className="bg-white rounded-2xl border border-blue-200 p-4">
          <span className="block text-xs text-[#2563eb]">{t("tradiePulse.netCashPulse")}</span>
          <span className={`font-mono text-lg font-extrabold ${pulse.netCashPosition >= 0 ? "text-emerald-700" : "text-red-600"}`}>
            {formatCurrency(pulse.netCashPosition, currency, locale)}
          </span>
        </div>
      </div>
    </section>
  );
}
