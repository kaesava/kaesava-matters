import type { z } from "zod";
import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import { tradieRolePolicy, type TradiePermission } from "../rbac/policy.js";

export interface TradieProcedureContext {
  db: DbOrTx;
  tenantId?: string | null;
  appId?: string;
  userId?: string;
  role?: string | null;
  appRole?: string | null;
}

export interface TradieProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: TradieProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: TradieProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: TradieProcedureContext }) => Promise<TOut>): TProc;
  mutation<TOut>(fn: (opts: { ctx: TradieProcedureContext }) => Promise<TOut>): TProc;
}

export interface CreateTradieRouterDeps<TProc> {
  tenantProcedure: TradieProcedureBuilder<TProc>;
}

export function requireTradieCtx(ctx: TradieProcedureContext) {
  if (!ctx.tenantId || !ctx.appId || !ctx.userId) {
    throw new Error("Tenant context (tenantId, appId, userId) is required.");
  }
  return {
    db: ctx.db,
    tenantId: ctx.tenantId,
    appId: ctx.appId,
    userId: ctx.userId,
    role: ctx.role ?? null,
    appRole: ctx.appRole ?? null,
  };
}

export function assertTradiePermission(
  ctx: { role: string | null; appRole: string | null },
  permission: TradiePermission
): void {
  if (!tradieRolePolicy.can(ctx.role, ctx.appRole, permission)) {
    throw new Error(`Insufficient permissions (${permission}).`);
  }
}
