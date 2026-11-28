export interface CalendarResource {
  id: string;
  name: string;
  color?: string;
  subtitle?: string;
}

export interface CalendarEventItem {
  id: string;
  resourceId: string | null;
  title: string;
  subtitle?: string;
  startIso: string;
  endIso: string;
  status?: string;
  badge?: string;
  accentColor?: string;
}

export interface PositionedCalendarEvent extends CalendarEventItem {
  startMinutes: number;
  endMinutes: number;
  column: number;
  totalColumns: number;
  topPercent: number;
  heightPercent: number;
}

export interface DayLayoutOptions {
  dayStartMinutes?: number;
  dayEndMinutes?: number;
  minDurationMinutes?: number;
}

export interface DayLayoutResult {
  events: PositionedCalendarEvent[];
  dayStartMinutes: number;
  dayEndMinutes: number;
}

export interface DateRangeResult {
  startIso: string;
  endIso: string;
  dates: string[];
}
