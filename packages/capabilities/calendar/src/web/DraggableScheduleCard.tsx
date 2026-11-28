import type { DragEvent } from "react";
import { formatTimeRangeLabel } from "../domain/dateRange";
import type { CalendarEventItem } from "../domain/types";
import { t } from "../i18n";

export interface DraggableScheduleCardProps {
  event: CalendarEventItem;
  isUnscheduled?: boolean;
  onSelect?: (event: CalendarEventItem) => void;
  onDragStartEvent?: (event: CalendarEventItem) => void;
  className?: string;
}

export function DraggableScheduleCard({
  event,
  isUnscheduled = false,
  onSelect,
  onDragStartEvent,
  className = "",
}: DraggableScheduleCardProps) {
  const handleDragStart = (e: DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData("text/plain", event.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStartEvent?.(event);
  };

  return (
    <button
      type="button"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect?.(event)}
      title={t("calendar.dragHint")}
      className={`w-full text-left rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm hover:border-[#2563eb] focus:outline-none focus:ring-2 focus:ring-[#2563eb] transition-colors cursor-grab active:cursor-grabbing ${className}`}
      style={event.accentColor ? { borderLeftWidth: 4, borderLeftColor: event.accentColor } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-semibold text-[#1B2B4B] truncate">{event.title}</span>
        {event.badge ? (
          <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
            {event.badge}
          </span>
        ) : null}
      </div>
      <div className="mt-0.5 text-[11px] font-mono tabular-nums text-slate-500">
        {isUnscheduled ? t("calendar.dragHint") : formatTimeRangeLabel(event.startIso, event.endIso)}
      </div>
      {event.subtitle ? (
        <div className="mt-0.5 text-[11px] text-slate-500 truncate">{event.subtitle}</div>
      ) : null}
    </button>
  );
}
