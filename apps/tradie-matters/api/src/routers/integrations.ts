import type { AnyProcedure } from "@trpc/server";
import {
  createAccountingRouter,
  createSmsRouter,
  createSuppliersRouter,
  type IntegrationsProcedureBuilder,
} from "@tradie-matters/capability-integrations/router";
import { publicProcedure, tenantProcedure } from "../trpc/trpc.js";

const tenantProc = tenantProcedure as unknown as IntegrationsProcedureBuilder<AnyProcedure>;
const pubProc = publicProcedure as unknown as IntegrationsProcedureBuilder<AnyProcedure>;

export const accountingRouter = createAccountingRouter<AnyProcedure>({
  tenantProcedure: tenantProc,
});

export const suppliersRouter = createSuppliersRouter<AnyProcedure>({
  tenantProcedure: tenantProc,
});

export const smsRouter = createSmsRouter<AnyProcedure>({
  tenantProcedure: tenantProc,
  publicProcedure: pubProc,
});
