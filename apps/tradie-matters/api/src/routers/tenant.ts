import { and, eq, isNull } from "drizzle-orm";
import { tenants, tenantUsers } from "@kaesava/db/rings/platform";
import type { AnyProcedure } from "@trpc/server";
import { createTenantRouter, type TenantProcedureBuilder } from "@kaesava/capability-tenant/router";
import { deleteFileFromBucket } from "@kaesava/core";
import { createTradieTenantLifecycleHooks } from "@tradie-matters/capability-operations";
import { TRADIE_MATTERS_APP_ID } from "../manifest.js";
import {
  authenticatedProcedure,
  ownerProcedure,
  publicProcedure,
  tenantProcedure,
} from "../trpc/trpc.js";

const baseTenantRouter = createTenantRouter<AnyProcedure>({
  publicProcedure: publicProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  authenticatedProcedure: authenticatedProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  tenantProcedure: tenantProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  ownerProcedure: ownerProcedure as unknown as TenantProcedureBuilder<AnyProcedure>,
  hooks: createTradieTenantLifecycleHooks(),
  deleteFileFromBucket,
});

export const tenantRouter = {
  ...baseTenantRouter,
  getTenantStatus: authenticatedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db
      .select({
        tenantId: tenantUsers.tenantId,
        role: tenantUsers.role,
        appRole: tenantUsers.appRole,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantUsers.userId, ctx.userId),
          eq(tenants.appId, ctx.appId ?? TRADIE_MATTERS_APP_ID),
          isNull(tenantUsers.archivedAt),
          isNull(tenants.archivedAt)
        )
      );
    const active = memberships.find((m) => m.tenantId === ctx.tenantId) ?? memberships[0] ?? null;
    return {
      hasTenant: memberships.length > 0,
      setupCompleted: memberships.length > 0,
      tenantId: active?.tenantId ?? null,
      role: active?.role ?? null,
      appRole: active?.appRole ?? null,
    };
  }),
  listUserTenants: authenticatedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: tenants.id,
        name: tenants.name,
        role: tenantUsers.role,
        appRole: tenantUsers.appRole,
      })
      .from(tenantUsers)
      .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
      .where(
        and(
          eq(tenantUsers.userId, ctx.userId),
          eq(tenants.appId, ctx.appId ?? TRADIE_MATTERS_APP_ID),
          isNull(tenantUsers.archivedAt),
          isNull(tenants.archivedAt)
        )
      );
  }),
};
