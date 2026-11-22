import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { incomeEvents, incomeSources, bankAccounts, apps } from "@kaesava/db";
import { and, eq, sql } from "drizzle-orm";
import { captureIfConsented } from '../../lib/posthog.js';
import {
  runAllocationCommand,
  previewPaydayQuery,
  resetAllocationPlanCommand,
  getPaydayPlanAnalyticsQuery,
  listAllAllocationPlansQuery,
} from "@money-matters/capability-budgeting";
import {
  ConfirmPaydayCommand,
  GetPaydayPlanAnalyticsQuerySchema,
} from "@kaesava/types";
import { resolveEffectiveAppFlags } from "@kaesava/config";
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

export const paydayExecutionProcedures = {
  resetAllocationPlan: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);

      const [targetEvent] = await ctx.db
        .select({ bankAccountIsPrivate: bankAccounts.isPrivate, bankAccountUserId: bankAccounts.userId })
        .from(incomeEvents)
        .leftJoin(incomeSources, eq(incomeEvents.incomeSourceId, incomeSources.id))
        .leftJoin(bankAccounts, eq(incomeSources.receivingAccountId, bankAccounts.id))
        .where(and(eq(incomeEvents.id, input.incomeEventId), eq(incomeEvents.tenantId, ctx.tenantId!), eq(incomeEvents.appId, ctx.appId!), sql`${incomeEvents.archivedAt} IS NULL`));

      if (!targetEvent || (targetEvent.bankAccountIsPrivate && targetEvent.bankAccountUserId !== ctx.userId)) {
        throw new Error("Target income event not found.");
      }

      return await resetAllocationPlanCommand(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!);
    }),

  previewPayday: privateTenantProcedure
    .input(z.object({ incomeEventId: z.string().uuid() }).strict())
    .query(({ input, ctx }) =>
      previewPaydayQuery(input.incomeEventId, ctx.tenantId!, ctx.appId!, ctx.db, ctx.userId!)
    ),

  confirmPayday: privateTenantProcedure
    .input(ConfirmPaydayCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const customLines = input.lines?.map((l) => ({ bucketId: l.envelopeId, amount: l.amount, reasoning: l.reasoning }));
      const result = await runAllocationCommand(
        ctx.tenantId!,
        ctx.appId!,
        ctx.userId!,
        input.incomeEventId,
        parseFloat(input.actualAmount),
        ctx.db,
        customLines,
        input.markAsReceivedToday,
        input.runwayDays
      );

      await captureIfConsented(ctx.db, ctx.userId, 'payday_confirmed', {
        tenant_id: ctx.tenantId,
        line_count: customLines?.length ?? 0,
      });
      return result;
    }),

  listAllAllocationPlans: privateTenantProcedure
    .query(({ ctx }) => listAllAllocationPlansQuery(ctx.tenantId!, ctx.appId!, ctx.userId!, ctx.db)),

  getPaydayPlanAnalytics: privateTenantProcedure
    .input(GetPaydayPlanAnalyticsQuerySchema)
    .query(async ({ input, ctx }) => {
      const [appRecord] = await ctx.db.select({ featureFlags: apps.featureFlags }).from(apps).where(eq(apps.id, ctx.appId!)).limit(1);
      const flags = resolveEffectiveAppFlags(ctx.appId!, appRecord?.featureFlags);
      if (!flags.reports) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Reports feature is disabled for this application.' });
      }
      return await getPaydayPlanAnalyticsQuery(ctx.tenantId!, ctx.appId!, input, ctx.db);
    }),
};
