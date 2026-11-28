import { IdInput } from "../crm/schemas.js";
import {
  ApproveVariationInput,
  AttachJobPhotoInput,
  CheckInVisitInput,
  CheckOutVisitInput,
  CreateVariationInput,
  LogMaterialUsageInput,
  SyncFieldMutationsInput,
} from "../field/schemas.js";
import {
  checkInVisitCommand,
  checkOutVisitCommand,
  listTimeEntriesQuery,
} from "../field/timers.js";
import { approveVariationCommand, createVariationCommand } from "../field/variations.js";
import { attachJobPhotoCommand, logMaterialUsageCommand } from "../field/materials-photos.js";
import { syncFieldMutationsCommand } from "../field/sync.js";
import { assertTradiePermission, requireTradieCtx, type CreateTradieRouterDeps } from "./context.js";

export function createFieldRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    checkInVisit: deps.tenantProcedure.input(CheckInVisitInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "timesheets:write");
      return checkInVisitCommand(c.db, c, input);
    }),
    checkOutVisit: deps.tenantProcedure.input(CheckOutVisitInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "timesheets:write");
      return checkOutVisitCommand(c.db, c, input);
    }),
    listTimeEntries: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return listTimeEntriesQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    createVariation: deps.tenantProcedure.input(CreateVariationInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return createVariationCommand(c.db, c, input);
    }),
    approveVariation: deps.tenantProcedure.input(ApproveVariationInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return approveVariationCommand(c.db, c, input);
    }),
    logMaterialUsage: deps.tenantProcedure.input(LogMaterialUsageInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return logMaterialUsageCommand(c.db, c, input);
    }),
    attachJobPhoto: deps.tenantProcedure.input(AttachJobPhotoInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return attachJobPhotoCommand(c.db, c, input);
    }),
    syncMutations: deps.tenantProcedure.input(SyncFieldMutationsInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "timesheets:write");
      return syncFieldMutationsCommand(c.db, c, input);
    }),
  };
}
