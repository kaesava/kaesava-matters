export const CALENDAR_CAPABILITY_READY = true;

export type {
  CalendarResource,
  CalendarEventItem,
  PositionedCalendarEvent,
  DayLayoutOptions,
  DayLayoutResult,
  DateRangeResult,
} from "./domain/types";

export {
  parseIsoDate,
  toIsoDateString,
  addDays,
  startOfWeekIso,
  getDayRange,
  getWeekRange,
  formatHourLabel,
  extractTimeMinutes,
  formatTimeRangeLabel,
} from "./domain/dateRange";

export { layoutDay } from "./domain/layoutDay";
export { calendar } from "./i18n/index";
