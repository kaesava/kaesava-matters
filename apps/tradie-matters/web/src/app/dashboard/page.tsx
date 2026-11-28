"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, Spinner } from "@kaesava/ui/web";
import { trpc } from "../../lib/trpc";
import { BookkeeperExportModal } from "./components/BookkeeperExportModal";
import { PaydayPulseCards } from "./components/PaydayPulseCards";
import "../../i18n";

export default function DashboardPage() {
  const [exportOpen, setExportOpen] = useState(false);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const profileQuery = trpc.getBusinessProfile.useQuery();
  const pulseQuery = trpc.pulse.getWeeklyPaydayCashPulse.useQuery(undefined, { retry: false });
  const jobsQuery = trpc.jobs.list.useQuery({ limit: 50 });
  const boardQuery = trpc.dispatch.getBoard.useQuery({ rangeStart: todayStart.toISOString(), rangeEnd: todayEnd.toISOString() });

  if (profileQuery.isLoading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  const profile = profileQuery.data;
  const unbilledJobs = (jobsQuery.data ?? []).filter((j) => j.hasUnbilledExtras);
  const todayVisits = boardQuery.data?.visits ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.navOverview")}</h1>
        <Button type="button" variant="secondary" size="sm" onClick={() => setExportOpen(true)}>
          <Download className="w-4 h-4" /><span>{t("tradiePulse.accountantExport")}</span>
        </Button>
      </div>

      {pulseQuery.data && <PaydayPulseCards pulse={pulseQuery.data} />}

      {unbilledJobs.length > 0 && (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800 text-sm font-bold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{t("tradieWeb.unbilledExtrasAlert", { count: String(unbilledJobs.length) })}</span>
          </div>
          <Link href="/dashboard/jobs" className="text-xs font-bold text-[#2563eb] underline">{t("tradieWeb.reviewJobsAction")}</Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradieWeb.todaysCrewTitle")}</h2>
          {todayVisits.length === 0 ? (
            <p className="text-xs text-slate-500">{t("tradieWeb.noVisitsTodayEmpty")}</p>
          ) : (
            <div className="space-y-2">
              {todayVisits.slice(0, 5).map((v) => (
                <div key={v.id} className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                  <span className="font-semibold text-[#1B2B4B]">{v.title}</span>
                  <Badge variant="primary">{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradieWeb.dashboardOverviewTitle")}</h2>
          <p className="text-lg font-extrabold text-[#1B2B4B]">{profile?.businessName || t("tradieWeb.appName")}</p>
          <p className="text-xs text-slate-500">{t("tradieWeb.dashboardAbnLabel")}: <span className="font-mono font-semibold text-slate-700">{profile?.abn || "-"}</span></p>
          <Badge variant={profile?.gstRegistered ? "success" : "warning"}>
            {profile?.gstRegistered ? t("tradieWeb.dashboardGstStatus") : t("tradieWeb.dashboardNotRegistered")}
          </Badge>
        </section>
      </div>

      <BookkeeperExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
}
