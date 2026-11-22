import { privateTenantProcedure } from '../trpc/trpc.js';
import { bugReportsProcedures } from "@kaesava/capability-bug-reports/router";

export const bugReportsRouter = {
  submitFeedback: privateTenantProcedure
    .input(bugReportsProcedures.submitFeedback.input)
    .mutation(async ({ ctx, input }) => {
      // NOTE: Intentionally do NOT call requiresWriteAccess(ctx) so users in read-only / grace-period states can submit feedback and report bugs.
      return await bugReportsProcedures.submitFeedback.execute(input, {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        appId: ctx.appId,
        userEmail: ctx.email,
      });
    }),
};
