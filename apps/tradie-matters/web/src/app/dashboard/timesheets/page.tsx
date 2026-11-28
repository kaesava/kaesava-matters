"use client";

import React from "react";
import { Check } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, Spinner, useToast } from "@kaesava/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { trpc } from "../../../lib/trpc";

export default function TimesheetsPage() {
  const { success } = useToast();
  const { fmtDateMedium } = useLocale();
  const utils = trpc.useUtils();
  const listQuery = trpc.timesheets.list.useQuery();
  const approveMut = trpc.timesheets.approve.useMutation({
    onSuccess: async () => {
      await utils.timesheets.list.invalidate();
      success(t("tradieWeb.timesheetUpdatedSuccess"));
    },
  });

  if (listQuery.isLoading) return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  const rows = listQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradiePulse.timesheets")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.timesheetsSubtitle")}</p>
      </div>

      {rows.length === 0 ? (
        <div className="ui-card text-center py-10 text-sm text-slate-500">{t("tradieWeb.noTimeEntriesEmpty")}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-bold">{t("tradieWeb.crewMemberLabel")}</th>
                <th className="px-4 py-3 text-left font-bold">{t("tradieWeb.selectJobLabel")}</th>
                <th className="px-4 py-3 text-center font-bold">{t("tradieWeb.visitDateLabel")}</th>
                <th className="px-4 py-3 text-right font-bold">{t("tradieWeb.durationHeader")}</th>
                <th className="px-4 py-3 text-center font-bold">{t("tradieJobs.statusLabel")}</th>
                <th className="px-4 py-3 text-center font-bold">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.entry.id}>
                  <td className="px-4 py-3 text-left font-medium text-[#1B2B4B]">{r.workerName || r.workerEmail || "-"}</td>
                  <td className="px-4 py-3 text-left text-slate-600">{r.jobNumber ? `${r.jobNumber} — ${r.jobTitle ?? ""}` : "-"}</td>
                  <td className="px-4 py-3 text-center text-xs text-slate-500">{fmtDateMedium(r.entry.startedAt)}</td>
                  <td className="px-4 py-3 text-right font-mono">{t("tradieWeb.durationMinutes", { minutes: String(r.entry.durationMinutes ?? 0) })}</td>
                  <td className="px-4 py-3 text-center">
                    <Badge variant={r.entry.isBillable ? "success" : "warning"}>
                      {r.entry.isBillable ? t("tradieWeb.billableBadge") : t("tradieWeb.nonBillableBadge")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={approveMut.isPending}
                      onClick={() => approveMut.mutate({ entryId: r.entry.id, isBillable: !r.entry.isBillable })}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{r.entry.isBillable ? t("tradieWeb.markNonBillable") : t("tradiePulse.approveTimesheet")}</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
