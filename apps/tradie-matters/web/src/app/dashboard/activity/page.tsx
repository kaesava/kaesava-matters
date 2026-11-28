"use client";

import React from "react";
import { Download } from "lucide-react";
import { t } from "@kaesava/i18n";
import { ActivityHistoryTable, Button, formatCurrency, useCurrencyLocale, type ActivityHistoryItem } from "@kaesava/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { trpc } from "../../../lib/trpc";

export default function ActivityPage() {
  const { currency, locale } = useCurrencyLocale();
  const { fmtDateMedium } = useLocale();
  const activityQuery = trpc.activity.list.useQuery();
  const rows = activityQuery.data ?? [];

  const items: ActivityHistoryItem[] = rows.map((r) => ({
    id: r.id,
    actorName: r.kind,
    action: formatCurrency(Number(r.amount), currency, locale),
    target: r.title,
    summary: r.subtitle ? `${r.title} — ${r.subtitle}` : r.title,
    timestamp: r.occurredAt,
    badgeVariant: r.kind === "PAYMENT" || r.kind === "DEPOSIT" ? "success" : r.kind === "REFUND" ? "danger" : "primary",
  }));

  const exportCsv = () => {
    const header = "Id,Kind,Title,Subtitle,Amount,OccurredAt\n";
    const body = rows
      .map((r) => [r.id, r.kind, `"${r.title.replace(/"/g, '""')}"`, `"${(r.subtitle ?? "").replace(/"/g, '""')}"`, r.amount, r.occurredAt].join(","))
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tradie-activity-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradiePulse.financialActivity")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.activitySubtitle")}</p>
        </div>
        <Button type="button" variant="secondary" disabled={rows.length === 0} onClick={exportCsv}>
          <Download className="w-4 h-4" /><span>{t("tradieWeb.exportCsvAction")}</span>
        </Button>
      </div>

      <ActivityHistoryTable
        items={items}
        isLoading={activityQuery.isLoading}
        emptyMessage={t("tradieWeb.noActivityEmpty")}
        headers={{
          actor: t("tradieWeb.activityKindHeader"),
          action: t("tradieWeb.amountLabel"),
          target: t("tradieWeb.activitySummaryHeader"),
          timestamp: t("tradieWeb.activityTimeHeader"),
        }}
        formatTimestamp={(iso) => fmtDateMedium(iso)}
      />
    </div>
  );
}
