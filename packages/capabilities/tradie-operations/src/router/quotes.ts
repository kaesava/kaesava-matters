import { z } from "zod";
import {
  AcceptQuoteViaPortalInput,
  CreateQuoteInput,
  DeclineQuoteViaPortalInput,
  QuotePortalTokenInput,
  SendQuoteInput,
  UpdateQuoteInput,
} from "../quotes/schemas.js";
import { getQuoteByIdQuery, listQuotesQuery } from "../quotes/queries.js";
import {
  archiveQuoteCommand,
  createQuoteCommand,
  sendQuoteCommand,
  updateQuoteCommand,
} from "../quotes/commands.js";
import {
  acceptQuoteViaPortalCommand,
  declineQuoteViaPortalCommand,
  viewQuoteViaPortalCommand,
} from "../quotes/portal.js";
import {
  assertTradiePermission,
  requireTradieCtx,
  type CreateTradieRouterDeps,
  type TradieProcedureBuilder,
} from "./context.js";

export function createQuotesRouter<TProc>(deps: CreateTradieRouterDeps<TProc>) {
  return {
    list: deps.tenantProcedure
      .input(z.object({ status: z.string().optional() }).strict().optional())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:read");
        return listQuotesQuery(c.db, c.tenantId, c.appId, input?.status);
      }),

    getById: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .query(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "jobs:read");
        return getQuoteByIdQuery(c.db, c.tenantId, c.appId, input.id);
      }),

    create: deps.tenantProcedure
      .input(CreateQuoteInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "quotes:write");
        return createQuoteCommand(c.db, c, input);
      }),

    update: deps.tenantProcedure
      .input(UpdateQuoteInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "quotes:write");
        return updateQuoteCommand(c.db, c, input);
      }),

    send: deps.tenantProcedure
      .input(SendQuoteInput)
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "quotes:write");
        return sendQuoteCommand(c.db, c, input.id, input.recipientEmail);
      }),

    archive: deps.tenantProcedure
      .input(z.object({ id: z.string().uuid() }).strict())
      .mutation(async ({ ctx, input }) => {
        const c = requireTradieCtx(ctx);
        assertTradiePermission(c, "quotes:write");
        return archiveQuoteCommand(c.db, c, input.id);
      }),
  };
}

export function createPortalQuoteRouter<TProc>(deps: {
  publicProcedure: TradieProcedureBuilder<TProc>;
}) {
  return {
    view: deps.publicProcedure
      .input(QuotePortalTokenInput)
      .query(async ({ ctx, input }) => viewQuoteViaPortalCommand(ctx.db, input.rawToken)),

    accept: deps.publicProcedure
      .input(AcceptQuoteViaPortalInput)
      .mutation(async ({ ctx, input }) => acceptQuoteViaPortalCommand(ctx.db, input)),

    decline: deps.publicProcedure
      .input(DeclineQuoteViaPortalInput)
      .mutation(async ({ ctx, input }) => declineQuoteViaPortalCommand(ctx.db, input)),
  };
}
