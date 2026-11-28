import type { AnyProcedure } from "@trpc/server";
import {
  createBusinessRouter,
  type BusinessProcedureBuilder,
} from "@tradie-matters/capability-operations/router";
import { tenantProcedure } from "../trpc/trpc.js";

export const businessRouter = createBusinessRouter<AnyProcedure>({
  tenantProcedure: tenantProcedure as unknown as BusinessProcedureBuilder<AnyProcedure>,
});
