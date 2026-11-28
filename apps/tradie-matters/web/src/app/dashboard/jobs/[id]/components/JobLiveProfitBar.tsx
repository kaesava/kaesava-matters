"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge, formatCurrency, useCurrencyLocale } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export function JobLiveProfitBar({ jobId }: { jobId: string }) {
  const { currency, locale } = useCurrencyLocale();
  const marginQuery = trpc.pulse.getJobMargin.useQuery({ jobId }, { enabled: Boolean(jobId) });
  const data = marginQuery.data;

  if (!data || data.redacted) return null;

  return (
    <section className="ui-card grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.revenueExGstLabel")}</span>
        <span className="font-mono text-sm font-bold text-[#1B2B4B]">{formatCurrency(data.revenueExTax, currency, locale)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.labourCostLabel")}</span>
        <span className="font-mono text-sm font-semibold text-slate-700">{formatCurrency(data.labourCost, currency, locale)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.materialCostLabel")}</span>
        <span className="font-mono text-sm font-semibold text-slate-700">{formatCurrency(data.materialCost, currency, locale)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradiePulse.grossProfit")}</span>
        <span className="font-mono text-sm font-extrabold text-emerald-700">{formatCurrency(data.grossProfit, currency, locale)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradiePulse.jobMargin")}</span>
        <Badge variant={data.marginPct >= 30 ? "success" : "warning"}>{data.marginPct.toFixed(1)}%</Badge>
      </div>
    </section>
  );
}
