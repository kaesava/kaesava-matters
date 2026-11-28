import type { DragEvent } from "react";
import { getWeekRange } from "../domain/dateRange";
import type { CalendarEventItem, CalendarResource } from "../domain/types";
import { t } from "../i18n";
import { DraggableScheduleCard } from "./DraggableScheduleCard";

export interface ResourceWeekGridProps {
  anchorDateIso: string;
  resources: readonly CalendarResource[];
  events: readonly CalendarEventItem[];
  onSelectEvent?: (event: CalendarEventItem) => void;
  onDropDayCell?: (eventId: string, resourceId: string, dateIso: string) => void;
}

export function ResourceWeekGrid({
  anchorDateIso,
  resources,
  events,
  onSelectEvent,
  onDropDayCell,
}: ResourceWeekGridProps) {
  const { dates } = getWeekRange(anchorDateIso, 1);
  const weekdayLabels = [
    t("calendar.weekdays.mon"),
    t("calendar.weekdays.tue"),
    t("calendar.weekdays.wed"),
    t("calendar.weekdays.thu"),
    t("calendar.weekdays.fri"),
    t("calendar.weekdays.sat"),
    t("calendar.weekdays.sun"),
  ];

  const handleDrop = (e: DragEvent<HTMLDivElement>, resourceId: string, dateIso: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (eventId) onDropDayCell?.(eventId, resourceId, dateIso);
  };

  if (resources.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
        {t("calendar.noResources")}
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white overflow-x-auto">
      <div className="border-b border-slate-200 px-4 py-2.5 bg-[#F7F8FA]">
        <h2 className="text-sm font-semibold text-[#1B2B4B]">{t("calendar.weekGridTitle")}</h2>
      </div>
      <div className="min-w-[840px]">
        <div className="grid grid-cols-8 border-b border-slate-200 bg-[#F7F8FA]">
          <div className="px-3 py-2 text-xs font-semibold text-slate-600 border-r border-slate-200">
            {t("calendar.resourceColumn")}
          </div>
          {dates.map((dateIso, idx) => (
            <div key={dateIso} className="px-2 py-2 text-center border-r border-slate-200 last:border-r-0">
              <div className="text-xs font-semibold text-[#1B2B4B]">{weekdayLabels[idx]}</div>
              <div className="text-[11px] font-mono tabular-nums text-slate-500">{dateIso.slice(5)}</div>
            </div>
          ))}
        </div>
        {resources.map((res) => (
          <div key={res.id} className="grid grid-cols-8 border-b border-slate-200 last:border-b-0">
            <div className="px-3 py-3 text-xs font-semibold text-[#1B2B4B] border-r border-slate-200 bg-white">
              {res.name || t("calendar.unassignedResource")}
            </div>
            {dates.map((dateIso) => {
              const cellEvents = events.filter((ev) => ev.resourceId === res.id && ev.startIso.startsWith(dateIso));
              return (
                <div
                  key={dateIso}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, res.id, dateIso)}
                  className="min-h-[84px] p-1.5 flex flex-col gap-1.5 border-r border-slate-200 last:border-r-0 bg-white"
                >
                  {cellEvents.map((ev) => (
                    <DraggableScheduleCard key={ev.id} event={ev} onSelect={onSelectEvent} />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
