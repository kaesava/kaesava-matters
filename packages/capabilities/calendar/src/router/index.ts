import { z } from "zod";
import { parseIsoDate } from "../domain/dateRange";

const MS_PER_DAY = 86_400_000;
const DEFAULT_MAX_WINDOW_DAYS = 93;

export const IsoDateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const CalendarDayInputSchema = z
  .object({
    date: IsoDateStringSchema,
    resourceId: z.string().uuid().optional(),
  })
  .strict();

export const CalendarWindowInputSchema = z
  .object({
    startDate: IsoDateStringSchema,
    endDate: IsoDateStringSchema,
    resourceId: z.string().uuid().optional(),
  })
  .strict()
  .refine((val) => val.startDate <= val.endDate, {
    message: "startDate must be on or before endDate",
    path: ["endDate"],
  });

export const AssignScheduleSlotInputSchema = z
  .object({
    eventId: z.string().uuid(),
    resourceId: z.string().uuid().nullable(),
    startIso: z.string().min(1),
    endIso: z.string().min(1),
  })
  .strict();

export type CalendarDayInput = z.infer<typeof CalendarDayInputSchema>;
export type CalendarWindowInput = z.infer<typeof CalendarWindowInputSchema>;
export type AssignScheduleSlotInput = z.infer<typeof AssignScheduleSlotInputSchema>;

/** Validates a YYYY-MM-DD date window and enforces a maximum day span. */
export function validateDateWindow(
  startDate: string,
  endDate: string,
  maxDays: number = DEFAULT_MAX_WINDOW_DAYS,
): { startDate: string; endDate: string; dayCount: number } {
  const parsed = CalendarWindowInputSchema.parse({ startDate, endDate });
  const startMs = parseIsoDate(parsed.startDate).getTime();
  const endMs = parseIsoDate(parsed.endDate).getTime();
  const dayCount = Math.floor((endMs - startMs) / MS_PER_DAY) + 1;
  if (dayCount > maxDays) {
    throw new Error(`Date window exceeds maximum of ${maxDays} days.`);
  }
  return { startDate: parsed.startDate, endDate: parsed.endDate, dayCount };
}

export interface CalendarProcedureContext {
  tenantId?: string | null;
  appId?: string;
  userId?: string;
}

export interface CalendarProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: CalendarProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: CalendarProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
}

export interface CreateCalendarRouterDeps<TProc, TWindowOut, TAssignOut> {
  tenantProcedure: CalendarProcedureBuilder<TProc>;
  getWindow: (ctx: CalendarProcedureContext, input: CalendarWindowInput) => Promise<TWindowOut>;
  assignSlot: (ctx: CalendarProcedureContext, input: AssignScheduleSlotInput) => Promise<TAssignOut>;
  maxWindowDays?: number;
}

/** Composes a tenant-scoped calendar router with validated date-window queries. */
export function createCalendarRouter<TProc, TWindowOut, TAssignOut>(
  deps: CreateCalendarRouterDeps<TProc, TWindowOut, TAssignOut>,
) {
  return {
    getWindow: deps.tenantProcedure
      .input(CalendarWindowInputSchema)
      .query(async ({ ctx, input }) => {
        validateDateWindow(input.startDate, input.endDate, deps.maxWindowDays);
        return deps.getWindow(ctx, input);
      }),
    assignSlot: deps.tenantProcedure
      .input(AssignScheduleSlotInputSchema)
      .mutation(async ({ ctx, input }) => deps.assignSlot(ctx, input)),
  };
}
