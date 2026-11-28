import type { AnyProcedure } from "@trpc/server";
import { createTenantRouter, type TenantProcedureBuilder } from "@kaesava/capability-tenant/router";
import { deleteFileFromBucket } from "@kaesava/core";
import { createTradieTenantLifecycleHooks } from "@tradie-matters/capability-operations";
import {
  authenticatedProcedure,
  ownerProcedure,
  publicProcedure,
  tenantProcedure,
} from "../trpc/trpc.js";

export const tenantRouter = createTenantRouter<AnyProcedure>({
  publicProcedure: publicProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  authenticatedProcedure: authenticatedProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  tenantProcedure: tenantProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  ownerProcedure: ownerProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  hooks: createTradieTenantLifecycleHooks(),
  deleteFileFromBucket,
});
