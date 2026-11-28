"use client";

import React, { useState } from "react";
import { Play, Plus, Square } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, fmtDateMedium, useDateLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";
import { VisitFormModal } from "../../../schedule/components/VisitFormModal";

export interface JobVisitItem {
  id: string;
  title: string;
  status: string;
  scheduledStart: Date | string;
  scheduledEnd: Date | string;
}

export interface JobTimeEntryItem {
  id: string;
  startedAt: Date | string;
  endedAt: Date | string | null;
  durationMinutes: number | null;
  isBillable: boolean;
  notes: string | null;
}

export interface JobVisitsTimersTabProps {
  jobId: string;
  jobTitle: string;
  visits: readonly JobVisitItem[];
  timeEntries: readonly JobTimeEntryItem[];
}

export function JobVisitsTimersTab({ jobId, jobTitle, visits, timeEntries }: JobVisitsTimersTabProps) {
  const { success } = useToast();
  const { locale, timeZone } = useDateLocale();
  const utils = trpc.useUtils();
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const checkInMut = trpc.field.checkInVisit.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });
  const checkOutMut = trpc.field.checkOutVisit.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });

  const handleCheckIn = async (visitId: string) => {
    await checkInMut.mutateAsync({ visitId });
    success(t("tradieWeb.checkedInSuccess"));
  };

  const handleCheckOut = async (visitId: string) => {
    await checkOutMut.mutateAsync({ visitId, isBillable: true });
    success(t("tradieWeb.checkedOutSuccess"));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieWeb.tabVisitsTimers")}</h2>
        <Button type="button" size="sm" onClick={() => setScheduleOpen(true)}>
          <Plus className="w-4 h-4" />
          <span>{t("tradieJobs.scheduleVisitAction")}</span>
        </Button>
      </div>

      {visits.length === 0 ? (
        <div className="ui-card text-center py-8 text-xs text-slate-500">{t("tradieWeb.noVisitsEmpty")}</div>
      ) : (
        <div className="space-y-2">
          {visits.map((v) => (
            <div key={v.id} className="ui-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-[#1B2B4B]">{v.title}</div>
                <div className="text-xs text-slate-500">{fmtDateMedium(v.scheduledStart, timeZone, locale)}</div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={v.status === "CHECKED_IN" ? "success" : "primary"}>{v.status}</Badge>
                {v.status !== "CHECKED_IN" && v.status !== "COMPLETED" && (
                  <Button type="button" size="sm" variant="secondary" disabled={checkInMut.isPending} onClick={() => handleCheckIn(v.id)}>
                    <Play className="w-3.5 h-3.5" /><span>{t("tradieJobs.checkInAction")}</span>
                  </Button>
                )}
                {v.status === "CHECKED_IN" && (
                  <Button type="button" size="sm" disabled={checkOutMut.isPending} onClick={() => handleCheckOut(v.id)}>
                    <Square className="w-3.5 h-3.5" /><span>{t("tradieJobs.checkOutAction")}</span>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase text-slate-500">{t("tradieJobs.timeEntriesTitle")}</h3>
        {timeEntries.length === 0 ? (
          <p className="text-xs text-slate-500">{t("tradieWeb.noTimeEntriesEmpty")}</p>
        ) : (
          <div className="space-y-2">
            {timeEntries.map((te) => (
              <div key={te.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-900 dark:text-slate-100">{fmtDateMedium(te.startedAt, timeZone, locale)}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={te.isBillable ? "success" : "warning"}>{te.isBillable ? t("tradieWeb.billableBadge") : t("tradieWeb.nonBillableBadge")}</Badge>
                  <span className="font-mono font-bold text-[#1B2B4B]">{t("tradieWeb.durationMinutes", { minutes: String(te.durationMinutes ?? 0) })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <VisitFormModal isOpen={scheduleOpen} onClose={() => { setScheduleOpen(false); void utils.jobs.getDetail.invalidate({ id: jobId }); }} target={{ jobId, title: jobTitle }} />
    </div>
  );
}
