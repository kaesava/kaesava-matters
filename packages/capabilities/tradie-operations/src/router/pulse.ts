import { z } from "zod";
import { listFinancialActivityQuery } from "../invoicing/queries.js";
import { buildAccountantExportPackQuery } from "../pulse/export-pack.js";
import { getJobMarginQuery, getWeeklyPaydayCashPulseQuery } from "../pulse/queries.js";
import { approveTimesheetCommand, listTimesheetsQuery } from "../pulse/timesheets.js";
import {
  assertTradiePermission,
  requireTradieCtx,
  type CreateTradieRouterDeps,
} from "./context.js";

export function createTimesheetsRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure
      .input(z.object({ jobId: z.string().uuid().optional() }).strict().optional())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:read");
        return listTimesheetsQuery(c.db, c.tenantId, c.appId, input?.jobId);
      }),

    approve: deps.tenantProcedure
      .input(
        z
          .object({
            entryId: z.string().uuid(),
            isBillable: z.boolean(),
            durationMinutes: z.number().int().nonnegative().optional(),
            notes: z.string().max(1000).optional(),
          })
          .strict()
      )
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "timesheets:write");
        return approveTimesheetCommand(c.db, c, input);
      }),
  };
}

export function createActivityRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure
      .input(z.object({ jobId: z.string().uuid().optional() }).strict().optional())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "invoices:read");
        return listFinancialActivityQuery(c.db, c.tenantId, c.appId, input?.jobId);
      }),
  };
}

export function createPulseRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    getJobMargin: deps.tenantProcedure
      .input(
        z
          .object({
            jobId: z.string().uuid(),
            canViewMargins: z.boolean().optional(),
          })
          .strict()
      )
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:read");
        return getJobMarginQuery(c.db, {
          tenantId: c.tenantId,
          appId: c.appId,
          jobId: input.jobId,
          callerBaseRole: c.role,
          callerAppRole: c.appRole,
          canViewMargins: input.canViewMargins,
        });
      }),

    getWeeklyPaydayCashPulse: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "reports:read");
      return getWeeklyPaydayCashPulseQuery(c.db, c.tenantId, c.appId);
    }),

    exportAccountantPack: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "reports:read");
      return buildAccountantExportPackQuery(c.db, c.tenantId, c.appId);
    }),
  };
}
