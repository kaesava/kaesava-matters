import { z } from "zod";
import { ScheduleOverrideInputSchema } from "@kaesava/types/platform";

/**
 * Framework-agnostic procedure descriptors for `@kaesava/capability-schedules/router`.
 */
export function createSchedulesProcedures<TStore>(deps: {
  getStore: (ctx: { db: unknown; tenantId: string; appId: string; userId: string }) => TStore;
  previewBurst: (store: TStore, input: { seriesId: string; horizonMonths: number }) => Promise<unknown>;
  overrideOccurrence: (store: TStore, input: z.infer<typeof ScheduleOverrideInputSchema>) => Promise<unknown>;
  archiveOccurrence: (store: TStore, input: { occurrenceId: string }) => Promise<unknown>;
}) {
  return {
    previewBurst: {
      input: z.object({ seriesId: z.string().uuid(), horizonMonths: z.number().int().min(1).max(36).default(12) }).strict(),
      execute: async (ctx: { db: unknown; tenantId: string; appId: string; userId: string }, input: { seriesId: string; horizonMonths: number }) =>
        deps.previewBurst(deps.getStore(ctx), input),
    },
    overrideOccurrence: {
      input: ScheduleOverrideInputSchema,
      execute: async (ctx: { db: unknown; tenantId: string; appId: string; userId: string }, input: z.infer<typeof ScheduleOverrideInputSchema>) =>
        deps.overrideOccurrence(deps.getStore(ctx), input),
    },
    archiveOccurrence: {
      input: z.object({ occurrenceId: z.string().uuid() }).strict(),
      execute: async (ctx: { db: unknown; tenantId: string; appId: string; userId: string }, input: { occurrenceId: string }) =>
        deps.archiveOccurrence(deps.getStore(ctx), input),
    },
  };
}
