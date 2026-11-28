import { IdInput } from "../crm/schemas.js";
import {
  CreatePricebookItemInput,
  FuzzySearchPricebookInput,
  ImportPricebookCsvInput,
  InstallStarterPackInput,
  UpdatePricebookItemInput,
} from "../pricebook/schemas.js";
import { fuzzySearchPricebookQuery, listPricebookItemsQuery } from "../pricebook/queries.js";
import {
  archivePricebookItemCommand,
  createPricebookItemCommand,
  importPricebookCsvCommand,
  installStarterPackCommand,
  updatePricebookItemCommand,
} from "../pricebook/commands.js";
import { assertTradiePermission, requireTradieCtx, type CreateTradieRouterDeps } from "./context.js";

export function createPricebookRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure.query(async ({ ctx }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return listPricebookItemsQuery(c.db, c.tenantId, c.appId);
    }),
    fuzzySearch: deps.tenantProcedure
      .input(FuzzySearchPricebookInput)
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:read");
        return fuzzySearchPricebookQuery(c.db, c.tenantId, c.appId, input);
      }),
    create: deps.tenantProcedure
      .input(CreatePricebookItemInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return createPricebookItemCommand(c.db, c, input);
      }),
    update: deps.tenantProcedure
      .input(UpdatePricebookItemInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return updatePricebookItemCommand(c.db, c, input);
      }),
    archive: deps.tenantProcedure.input(IdInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return archivePricebookItemCommand(c.db, c, input.id);
    }),
    installStarterPack: deps.tenantProcedure
      .input(InstallStarterPackInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return installStarterPackCommand(c.db, c, input.packKey);
      }),
    importCsv: deps.tenantProcedure
      .input(ImportPricebookCsvInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:write");
        return importPricebookCsvCommand(c.db, c, input.source, input.csvText);
      }),
  };
}
