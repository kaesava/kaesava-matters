import {
  AssignVisitCrewInput,
  CreateVisitInput,
  GetDispatchBoardInput,
  RescheduleVisitInput,
} from "../dispatch/schemas.js";
import { getDispatchBoardQuery } from "../dispatch/queries.js";
import {
  assignVisitCrewCommand,
  createVisitCommand,
  rescheduleVisitCommand,
} from "../dispatch/commands.js";
import { assertTradiePermission, requireTradieCtx, type CreateTradieRouterDeps } from "./context.js";

export function createDispatchRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    getBoard: deps.tenantProcedure.input(GetDispatchBoardInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getDispatchBoardQuery(c.db, c.tenantId, c.appId, input);
    }),
    createVisit: deps.tenantProcedure.input(CreateVisitInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return createVisitCommand(c.db, c, input);
    }),
    rescheduleVisit: deps.tenantProcedure
      .input(RescheduleVisitInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return rescheduleVisitCommand(c.db, c, input);
      }),
    assignCrew: deps.tenantProcedure
      .input(AssignVisitCrewInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return assignVisitCrewCommand(c.db, c, input);
      }),
  };
}
