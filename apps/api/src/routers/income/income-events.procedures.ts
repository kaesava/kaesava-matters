import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import {
  createIncomeEventCommand,
  listIncomeEventsQuery,
  updateUpcomingIncomeCommand,
  deleteIncomeEventCommand,
} from "@money-matters/capability-budgeting";
import { CreateIncomeEventCommand } from "@money-matters/types";
import { z } from 'zod';

export const incomeEventsProcedures = {
  createIncomeEvent: privateTenantProcedure
    .input(CreateIncomeEventCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await createIncomeEventCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  listIncomeEvents: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await listIncomeEventsQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  updateUpcomingIncome: privateTenantProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        expectedAmount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(),
        expectedDate: z.string().optional(),
        contributionMode: z.enum(["FULL", "PERCENTAGE", "FIXED_AMOUNT"]).optional(),
        contributionValue: z.string().regex(/^\d+(\.\d{1,2})?$/).nullable().optional(),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await updateUpcomingIncomeCommand(input, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),

  deleteIncomeEvent: privateTenantProcedure
    .input(z.object({ eventId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      return await deleteIncomeEventCommand(input.eventId, ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db);
    }),
};
