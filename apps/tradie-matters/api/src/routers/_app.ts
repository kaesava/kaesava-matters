import { router } from "../trpc/trpc.js";
import { tenantRouter } from "./tenant.js";
import { billingRouter } from "./billing.js";
import { notificationsRouter } from "./notifications.js";
import { fileNotesRouter } from "./fileNotes.js";
import { businessRouter } from "./business.js";
import { geoRouter } from "./geo.js";
import { chatRouter } from "./chat.js";
import { accountingRouter, smsRouter, suppliersRouter } from "./integrations.js";
import {
  activityRouter,
  customersRouter,
  dispatchRouter,
  fieldRouter,
  invoicesRouter,
  jobsRouter,
  portalInvoiceRouter,
  portalQuoteRouter,
  pricebookRouter,
  pulseRouter,
  quotesRouter,
  sitesRouter,
  timesheetsRouter,
} from "./operations.js";

export const appRouter = router({
  ...tenantRouter,
  ...billingRouter,
  ...notificationsRouter,
  ...businessRouter,
  fileNotes: fileNotesRouter,
  geo: geoRouter,
  customers: customersRouter,
  sites: sitesRouter,
  pricebook: pricebookRouter,
  jobs: jobsRouter,
  dispatch: dispatchRouter,
  field: fieldRouter,
  quotes: quotesRouter,
  portalQuote: portalQuoteRouter,
  invoices: invoicesRouter,
  portalInvoice: portalInvoiceRouter,
  timesheets: timesheetsRouter,
  activity: activityRouter,
  pulse: pulseRouter,
  accounting: accountingRouter,
  suppliers: suppliersRouter,
  sms: smsRouter,
  chat: chatRouter,
});

export type AppRouter = typeof appRouter;
