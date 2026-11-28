import {
  CreateCustomerInput,
  CreateSiteInput,
  IdInput,
  LinkCustomerSiteInput,
  SearchListInput,
  UpdateCustomerInput,
  UpdateSiteInput,
} from "../crm/schemas.js";
import {
  getCustomerHistoryQuery,
  getCustomerQuery,
  getSiteHistoryQuery,
  getSiteQuery,
  listCustomersQuery,
  listSitesQuery,
} from "../crm/queries.js";
import {
  archiveCustomerCommand,
  archiveSiteCommand,
  createCustomerCommand,
  createSiteCommand,
  linkCustomerSiteCommand,
  updateCustomerCommand,
  updateSiteCommand,
} from "../crm/commands.js";
import { assertTradiePermission, requireTradieCtx, type CreateTradieRouterDeps } from "./context.js";

export function createCustomersRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure.input(SearchListInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return listCustomersQuery(c.db, c.tenantId, c.appId, input.search, input.limit);
    }),
    getById: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getCustomerQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    getHistory: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getCustomerHistoryQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    create: deps.tenantProcedure.input(CreateCustomerInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return createCustomerCommand(c.db, c, input);
    }),
    update: deps.tenantProcedure.input(UpdateCustomerInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return updateCustomerCommand(c.db, c, input);
    }),
    archive: deps.tenantProcedure.input(IdInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return archiveCustomerCommand(c.db, c, input.id);
    }),
    linkSite: deps.tenantProcedure.input(LinkCustomerSiteInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return linkCustomerSiteCommand(c.db, c, input);
    }),
  };
}

export function createSitesRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure.input(SearchListInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return listSitesQuery(c.db, c.tenantId, c.appId, input.search, input.limit);
    }),
    getById: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getSiteQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    getHistory: deps.tenantProcedure.input(IdInput).query(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:read");
      return getSiteHistoryQuery(c.db, c.tenantId, c.appId, input.id);
    }),
    create: deps.tenantProcedure.input(CreateSiteInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return createSiteCommand(c.db, c, input);
    }),
    update: deps.tenantProcedure.input(UpdateSiteInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return updateSiteCommand(c.db, c, input);
    }),
    archive: deps.tenantProcedure.input(IdInput).mutation(async ({ ctx, input }) => {
      const c = requireTradieCtx(ctx);
      assertTradiePermission(c, "jobs:write");
      return archiveSiteCommand(c.db, c, input.id);
    }),
  };
}
