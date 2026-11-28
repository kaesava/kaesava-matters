import type { DragEvent } from "react";
import type { CalendarEventItem } from "../domain/types";
import { t } from "../i18n";
import { DraggableScheduleCard } from "./DraggableScheduleCard";

export interface UnscheduledBacklogColumnProps {
  events: readonly CalendarEventItem[];
  onSelectEvent?: (event: CalendarEventItem) => void;
  onDropUnschedule?: (eventId: string) => void;
}

export function UnscheduledBacklogColumn({
  events,
  onSelectEvent,
  onDropUnschedule,
}: UnscheduledBacklogColumnProps) {
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData("text/plain");
    if (eventId) onDropUnschedule?.(eventId);
  };

  return (
    <aside
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="flex flex-col w-64 shrink-0 rounded-xl border border-slate-200 bg-[#F7F8FA] p-3"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[#1B2B4B]">{t("calendar.unscheduledTitle")}</h2>
        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
          {t("calendar.eventsCount", { count: events.length })}
        </span>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500">
          {t("calendar.unscheduledEmpty")}
        </div>
      ) : (
        <div className="flex flex-col gap-2 overflow-y-auto">
          {events.map((ev) => (
            <DraggableScheduleCard
              key={ev.id}
              event={ev}
              isUnscheduled
              onSelect={onSelectEvent}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
