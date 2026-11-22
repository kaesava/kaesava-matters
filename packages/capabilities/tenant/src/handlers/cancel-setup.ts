import { tenants, type DbOrTx } from "@money-matters/db/rings/capabilities";
import type { TenantLifecycleHooks } from "@money-matters/types";
import { and, eq } from "drizzle-orm";

export interface CancelSetupResult {
  success: true;
  setupStatus: "CANCELLED" | "COMPLETED";
  alreadyCompleted: boolean;
}

/**
 * Cancels the first-time Setup wizard.
 * Domain-specific minimal workspace seeding/archival is delegated via hooks.onSetupCancelled.
 */
export function cancelSetupHandler(db: DbOrTx, hooks?: TenantLifecycleHooks<DbOrTx>) {
  return async (tenantId: string, appId: string, userId: string): Promise<CancelSetupResult> => {
    return await db.transaction(async (tx) => {
      const [tenant] = await tx
        .select({ setupStatus: tenants.setupStatus })
        .from(tenants)
        .where(and(eq(tenants.id, tenantId), eq(tenants.appId, appId)))
        .limit(1);

      if (!tenant) {
        throw new Error("Tenant not found.");
      }

      if (tenant.setupStatus === "COMPLETED") {
        return { success: true, setupStatus: "COMPLETED", alreadyCompleted: true };
      }

      const now = new Date();
      await hooks?.onSetupCancelled?.({ db: tx, tenantId, appId, userId });

      await tx
        .update(tenants)
        .set({ setupStatus: "CANCELLED", setupCompletedAt: now, updatedAt: now, updatedBy: userId })
        .where(eq(tenants.id, tenantId));

      return { success: true, setupStatus: "CANCELLED", alreadyCompleted: false };
    });
  };
}
