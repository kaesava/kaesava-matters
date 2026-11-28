"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge } from "@kaesava/ui/web";
import { useLocale } from "../../../../../providers/LocaleProvider";
import { trpc } from "../../../../../lib/trpc";

export function JobLiveProfitBar({ jobId }: { jobId: string }) {
  const { fmt } = useLocale();
  const marginQuery = trpc.pulse.getJobMargin.useQuery({ jobId }, { enabled: Boolean(jobId) });
  const data = marginQuery.data;

  if (!data || data.redacted) return null;

  return (
    <section className="ui-card grid grid-cols-2 sm:grid-cols-5 gap-4 items-center">
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.revenueExGstLabel")}</span>
        <span className="font-mono tabular-nums text-sm font-bold text-[#1B2B4B]">{fmt(data.revenueExTax)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.labourCostLabel")}</span>
        <span className="font-mono tabular-nums text-sm font-semibold text-slate-700">{fmt(data.labourCost)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradieWeb.materialCostLabel")}</span>
        <span className="font-mono tabular-nums text-sm font-semibold text-slate-700">{fmt(data.materialCost)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradiePulse.grossProfit")}</span>
        <span className="font-mono tabular-nums text-sm font-extrabold text-emerald-700">{fmt(data.grossProfit)}</span>
      </div>
      <div>
        <span className="block text-xs text-slate-400">{t("tradiePulse.jobMargin")}</span>
        <Badge variant={data.marginPct >= 30 ? "success" : "warning"}>{data.marginPct.toFixed(1)}%</Badge>
      </div>
    </section>
  );
}
