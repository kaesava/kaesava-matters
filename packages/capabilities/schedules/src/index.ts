import { computeRecurringDates, planSeriesEditScope } from "./burst-engine.js";
import type {
  BurstWindowInput,
  ScheduleSeriesDefinition,
  ScheduleOccurrenceRecord,
  ScheduleEditScope,
  SeriesEditPlan,
} from "@kaesava/types";

export {
  computeRecurringDates,
  planSeriesEditScope,
  type BurstWindowInput,
  type ScheduleSeriesDefinition,
  type ScheduleOccurrenceRecord,
  type ScheduleEditScope,
  type SeriesEditPlan,
};

export interface ScheduleStoreAdapter {
  getSeries: (tenantId: string, seriesId: string) => Promise<ScheduleSeriesDefinition | null>;
  listOccurrences: (
    tenantId: string,
    seriesId: string
  ) => Promise<ScheduleOccurrenceRecord[]>;
  insertOccurrences: (
    tenantId: string,
    appId: string,
    seriesId: string,
    dates: string[]
  ) => Promise<ScheduleOccurrenceRecord[]>;
}

export function createSchedulesCapability(store: ScheduleStoreAdapter) {
  return {
    burstSeries: async (
      tenantId: string,
      appId: string,
      seriesId: string,
      fromDate: string,
      timezone: string,
      horizonMonths = 12
    ) => {
      const series = await store.getSeries(tenantId, seriesId);
      if (!series || !series.rrule || !series.startDate) {
        throw new Error("Schedule series not found");
      }
      const existing = await store.listOccurrences(tenantId, seriesId);
      const existingDates = new Set(existing.map((o) => o.expectedDate));
      const candidateDates = computeRecurringDates({
        rrule: series.rrule,
        startDate: series.startDate,
        endDate: series.endDate,
        fromDate,
        horizonMonths,
        timezone,
      });
      const newDates = candidateDates.filter((d) => !existingDates.has(d));
      if (newDates.length === 0) return [];
      return store.insertOccurrences(tenantId, appId, seriesId, newDates);
    },

    planEdit: async (params: {
      tenantId: string;
      seriesId: string;
      scope: ScheduleEditScope;
      fromDate: string;
      updatedRrule: string;
      timezone: string;
      horizonMonths?: number;
    }): Promise<SeriesEditPlan> => {
      const series = await store.getSeries(params.tenantId, params.seriesId);
      if (!series) throw new Error("Schedule series not found");
      const existing = await store.listOccurrences(params.tenantId, params.seriesId);
      return planSeriesEditScope({
        scope: params.scope,
        fromDate: params.fromDate,
        existingSeries: series,
        occurrences: existing,
        updatedRrule: params.updatedRrule,
        timezone: params.timezone,
        horizonMonths: params.horizonMonths,
      });
    },
  };
}
