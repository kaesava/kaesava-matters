"use client";

import React, { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { addDays, getWeekRange, type CalendarEventItem, type CalendarResource } from "@kaesava/capability-calendar";
import { ResourceDayTimeline, ResourceWeekGrid, UnscheduledBacklogColumn } from "@kaesava/capability-calendar/web";
import { Button, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { VisitFormModal, type VisitModalTarget } from "./components/VisitFormModal";

export default function SchedulePage() {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [view, setView] = useState<"day" | "week">("day");
  const [anchorDate, setAnchorDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [modal, setModal] = useState<{ open: boolean; target: VisitModalTarget | null }>({ open: false, target: null });

  const week = useMemo(() => getWeekRange(anchorDate, 1), [anchorDate]);
  const rangeStart = view === "day" ? `${anchorDate}T00:00:00.000Z` : week.startIso;
  const rangeEnd = view === "day" ? `${anchorDate}T23:59:59.999Z` : week.endIso;

  const boardQuery = trpc.dispatch.getBoard.useQuery({ rangeStart, rangeEnd });
  const crewQuery = trpc.listTeamMembersWithRates.useQuery();
  const rescheduleMut = trpc.dispatch.rescheduleVisit.useMutation({ onSuccess: () => utils.dispatch.getBoard.invalidate() });

  const resources: CalendarResource[] = (crewQuery.data ?? []).map((m) => ({ id: m.userId, name: m.displayName }));
  const visits = boardQuery.data?.visits ?? [];
  const visitEvents: CalendarEventItem[] = visits.map((v) => ({
    id: v.id,
    resourceId: v.assignees[0]?.userId ?? resources[0]?.id ?? null,
    title: v.title,
    startIso: new Date(v.scheduledStart).toISOString(),
    endIso: new Date(v.scheduledEnd).toISOString(),
    status: v.status,
  }));

  const unscheduledEvents: CalendarEventItem[] = (boardQuery.data?.unscheduledJobs ?? []).map((j) => ({
    id: `job:${j.id}`,
    resourceId: null,
    title: `${j.jobNumber} — ${j.title}`,
    startIso: `${anchorDate}T08:00:00.000Z`,
    endIso: `${anchorDate}T10:00:00.000Z`,
    status: j.status,
  }));

  const handleDrop = async (eventId: string, resourceId: string, dateIso: string, startMinutes = 480) => {
    if (eventId.startsWith("job:")) {
      const jobId = eventId.slice(4);
      const job = boardQuery.data?.unscheduledJobs.find((j) => j.id === jobId);
      const hh = String(Math.floor(startMinutes / 60)).padStart(2, "0");
      const mm = String(startMinutes % 60).padStart(2, "0");
      const endHh = String(Math.min(23, Math.floor((startMinutes + 120) / 60))).padStart(2, "0");
      setModal({ open: true, target: { jobId, title: job?.title ?? "", dateIso, startTime: `${hh}:${mm}`, endTime: `${endHh}:${mm}`, assigneeUserId: resourceId } });
      return;
    }
    const start = new Date(`${dateIso}T00:00:00`);
    start.setMinutes(startMinutes);
    const end = new Date(start.getTime() + 120 * 60_000);
    await rescheduleMut.mutateAsync({ visitId: eventId, scheduledStart: start.toISOString(), scheduledEnd: end.toISOString(), assigneeUserIds: [resourceId] });
    success(t("tradieWeb.visitRescheduled"));
  };

  const handleSelectEvent = (ev: CalendarEventItem) => {
    if (ev.id.startsWith("job:")) {
      const jobId = ev.id.slice(4);
      setModal({ open: true, target: { jobId, title: ev.title, dateIso: anchorDate } });
      return;
    }
    setModal({ open: true, target: { visitId: ev.id, title: ev.title, dateIso: ev.startIso.slice(0, 10), startTime: ev.startIso.slice(11, 16), endTime: ev.endIso.slice(11, 16), assigneeUserId: ev.resourceId ?? undefined } });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieJobs.dispatchTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.scheduleSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchorDate(addDays(anchorDate, view === "day" ? -1 : -7))}><ChevronLeft className="w-4 h-4" /></Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchorDate(new Date().toISOString().slice(0, 10))}>{t("tradieWeb.todayAction")}</Button>
          <Button type="button" variant="secondary" size="sm" onClick={() => setAnchorDate(addDays(anchorDate, view === "day" ? 1 : 7))}><ChevronRight className="w-4 h-4" /></Button>
          <span className="font-mono text-xs font-semibold text-slate-600 px-2">{anchorDate}</span>
          <Button type="button" variant={view === "day" ? "primary" : "secondary"} size="sm" onClick={() => setView("day")}>{t("tradieWeb.dayView")}</Button>
          <Button type="button" variant={view === "week" ? "primary" : "secondary"} size="sm" onClick={() => setView("week")}>{t("tradieWeb.weekView")}</Button>
          <Button type="button" onClick={() => setModal({ open: true, target: { dateIso: anchorDate } })}><Plus className="w-4 h-4" /><span>{t("tradieJobs.scheduleVisitAction")}</span></Button>
        </div>
      </div>

      {boardQuery.isLoading ? (
        <div className="py-12 flex justify-center"><Spinner size="lg" /></div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-stretch">
          <UnscheduledBacklogColumn events={unscheduledEvents} onSelectEvent={handleSelectEvent} />
          <div className="flex-1 min-w-0">
            {view === "day" ? (
              <ResourceDayTimeline dateIso={anchorDate} resources={resources} events={visitEvents} onSelectEvent={handleSelectEvent} onDropSlot={(id, resId, mins, d) => void handleDrop(id, resId, d, mins)} />
            ) : (
              <ResourceWeekGrid anchorDateIso={anchorDate} resources={resources} events={visitEvents} onSelectEvent={handleSelectEvent} onDropDayCell={(id, resId, d) => void handleDrop(id, resId, d)} />
            )}
          </div>
        </div>
      )}

      <VisitFormModal isOpen={modal.open} onClose={() => setModal({ open: false, target: null })} target={modal.target} />
    </div>
  );
}
