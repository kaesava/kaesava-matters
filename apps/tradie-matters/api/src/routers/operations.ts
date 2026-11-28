import { TRPCError, type AnyProcedure } from "@trpc/server";
import { checkRateLimit } from "@kaesava/core";
import {
  createActivityRouter,
  createCustomersRouter,
  createDispatchRouter,
  createFieldRouter,
  createInvoicesRouter,
  createJobsRouter,
  createPortalInvoiceRouter,
  createPortalQuoteRouter,
  createPricebookRouter,
  createPulseRouter,
  createQuotesRouter,
  createSitesRouter,
  createTimesheetsRouter,
  type TradieProcedureBuilder,
} from "@tradie-matters/capability-operations/router";
import { publicProcedure, tenantProcedure } from "../trpc/trpc.js";

const proc = tenantProcedure as unknown as TradieProcedureBuilder<AnyProcedure>;

const rateLimitedPortalProc = publicProcedure.use(async ({ ctx, next }) => {
  const reqCtx = ctx as { req?: Request; env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string } };
  const ip =
    reqCtx.req?.headers?.get("cf-connecting-ip") ??
    reqCtx.req?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "portal-ip";
  const { allowed } = await checkRateLimit(`tradie-portal:${ip}`, 30, 60, reqCtx.env);
  if (!allowed) {
    throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many portal requests. Try again shortly." });
  }
  return next();
}) as unknown as TradieProcedureBuilder<AnyProcedure>;

export const customersRouter = createCustomersRouter<AnyProcedure>({ tenantProcedure: proc });
export const sitesRouter = createSitesRouter<AnyProcedure>({ tenantProcedure: proc });
export const pricebookRouter = createPricebookRouter<AnyProcedure>({ tenantProcedure: proc });
export const jobsRouter = createJobsRouter<AnyProcedure>({ tenantProcedure: proc });
export const dispatchRouter = createDispatchRouter<AnyProcedure>({ tenantProcedure: proc });
export const fieldRouter = createFieldRouter<AnyProcedure>({ tenantProcedure: proc });
export const quotesRouter = createQuotesRouter<AnyProcedure>({ tenantProcedure: proc });
export const portalQuoteRouter = createPortalQuoteRouter<AnyProcedure>({
  publicProcedure: rateLimitedPortalProc,
});
export const invoicesRouter = createInvoicesRouter<AnyProcedure>({ tenantProcedure: proc });
export const portalInvoiceRouter = createPortalInvoiceRouter<AnyProcedure>({
  publicProcedure: rateLimitedPortalProc,
});
export const timesheetsRouter = createTimesheetsRouter<AnyProcedure>({ tenantProcedure: proc });
export const activityRouter = createActivityRouter<AnyProcedure>({ tenantProcedure: proc });
export const pulseRouter = createPulseRouter<AnyProcedure>({ tenantProcedure: proc });
