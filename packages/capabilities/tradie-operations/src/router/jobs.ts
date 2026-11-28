import { IdInput } from "../crm/schemas.js";
import {
  CreateJobInput,
  ListJobsInput,
  TransitionJobStatusInput,
  UpdateJobInput,
} from "../jobs/schemas.js";
import { getJobDetailQuery, listJobsQuery } from "../jobs/queries.js";
import {
  archiveJobCommand,
  createJobCommand,
  transitionJobStatusCommand,
  updateJobCommand,
} from "../jobs/commands.js";
import { assertTradiePermission, requireTradieCtx, type CreateTradieRouterDeps } from "./context.js";

export function createJobsRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure.input(ListJobsInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return listJobsQuery(c.db, c.tenantId, c.appId, input);
    }),
    getDetail: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getJobDetailQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    create: deps.tenantProcedure.input(CreateJobInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return createJobCommand(c.db, c, input);
    }),
    update: deps.tenantProcedure.input(UpdateJobInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return updateJobCommand(c.db, c, input);
    }),
    transitionStatus: deps.tenantProcedure
      .input(TransitionJobStatusInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return transitionJobStatusCommand(c.db, c, input.id, input.status);
      }),
    archive: deps.tenantProcedure.input(IdInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return archiveJobCommand(c.db, c, input.id);
    }),
  };
}
