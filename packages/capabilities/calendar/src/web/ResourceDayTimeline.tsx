import type { DragEvent } from "react";
import { formatHourLabel } from "../domain/dateRange";
import { layoutDay } from "../domain/layoutDay";
import type { CalendarEventItem, CalendarResource } from "../domain/types";
import { t } from "../i18n";
import { DraggableScheduleCard } from "./DraggableScheduleCard";

export interface ResourceDayTimelineProps {
  dateIso: string;
  resources: readonly CalendarResource[];
  events: readonly CalendarEventItem[];
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  onSelectEvent?: (event: CalendarEventItem) => void;
  onDropSlot?: (eventId: string, resourceId: string, startMinutes: number, dateIso: string) => void;
}

export function ResourceDayTimeline({
  dateIso,
  resources,
  events,
  dayStartMinutes = 360,
  dayEndMinutes = 1200,
  onSelectEvent,
  onDropSlot,
}: ResourceDayTimelineProps) {
  const hours = Array.from(
    { length: Math.max(1, Math.floor((dayEndMinutes - dayStartMinutes) / 60)) },
    (_, i) => dayStartMinutes + i * 60,
  );

  const handleDrop = (e: DragEvent<HTMLDivElement>, resourceId: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (!eventId || !onDropSlot) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = rect.height > 0 ? Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) : 0;
    const snapped = Math.round((dayStartMinutes + ratio * (dayEndMinutes - dayStartMinutes)) / 15) * 15;
    onDropSlot(eventId, resourceId, snapped, dateIso);
  };

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("calendar.noResources")}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 bg-[#F7F8FA]">
        <h2 className="text-sm font-semibold text-[#1B2B4B]">{t("calendar.dayTimelineTitle")}</h2>
        <span className="text-xs font-mono tabular-nums text-slate-500">{dateIso}</span>
      </div>
      <div className="flex overflow-x-auto">
        <div className="w-16 shrink-0 border-r border-slate-200 bg-[#F7F8FA]">
          <div className="h-10 border-b border-slate-200" />
          <div className="relative h-[640px]">
            {hours.map((m) => (
              <div key={m} className="h-[calc(640px/14)] pr-2 text-right text-[11px] font-mono tabular-nums text-slate-500">
                {formatHourLabel(m)}
              </div>
            ))}
          </div>
        </div>
        {resources.map((res) => {
          const laid = layoutDay(events.filter((ev) => ev.resourceId === res.id), { dayStartMinutes, dayEndMinutes });
          return (
            <div key={res.id} className="min-w-[200px] flex-1 border-r border-slate-200 last:border-r-0">
              <div className="flex h-10 items-center gap-2 border-b border-slate-200 px-3 bg-white">
                {res.color ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: res.color }} /> : null}
                <span className="text-xs font-semibold text-[#1B2B4B] truncate">
                  {res.name || t("calendar.unassignedResource")}
                </span>
              </div>
              <div onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, res.id)} className="relative h-[640px] bg-white">
                {laid.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="absolute px-0.5 py-0.5"
                    style={{
                      top: `${ev.topPercent}%`,
                      height: `${ev.heightPercent}%`,
                      left: `${(ev.column / ev.totalColumns) * 100}%`,
                      width: `${100 / ev.totalColumns}%`,
                    }}
                  >
                    <DraggableScheduleCard event={ev} onSelect={onSelectEvent} className="h-full overflow-hidden" />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
