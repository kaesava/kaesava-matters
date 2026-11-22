import { tenants, users, type DbOrTx } from "@money-matters/db/rings/capabilities";
import { eq } from "drizzle-orm";
import { serializeCsvObjects, DEFAULT_TIMEZONE, type TenantLifecycleHooks } from "@money-matters/types";

export function exportDataHandler(
  db: DbOrTx,
  _getPresignedDownloadUrl?: (fileKey: string, expiresIn?: number) => Promise<string>,
  hooks?: TenantLifecycleHooks<DbOrTx>
) {
  return async (tenantId: string, userId: string, appId: string) => {
    const [userRecord] = await db
      .select({ id: users.id, email: users.email, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const [tenantRecord] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    const domainCsvs =
      (await hooks?.onExportTenantData?.({ db, tenantId, userId, appId })) ?? {};

    const csvFiles: Record<string, string> = {
      "User_Profile.csv": serializeCsvObjects(
        userRecord ? [{ ...userRecord, globalTimezone: tenantRecord?.timezone || DEFAULT_TIMEZONE }] : [],
        ["id", "email", "displayName", "globalTimezone"]
      ),
      "Household_Profile.csv": serializeCsvObjects(
        tenantRecord
          ? [
              {
                id: tenantRecord.id,
                name: tenantRecord.name,
                subscriptionStatus: tenantRecord.subscriptionStatus,
                setupStatus: tenantRecord.setupStatus,
                subscriptionEndsAt: tenantRecord.subscriptionEndsAt,
                cancelAtPeriodEnd: tenantRecord.cancelAtPeriodEnd,
              },
            ]
          : [],
        ["id", "name", "subscriptionStatus", "setupStatus", "subscriptionEndsAt", "cancelAtPeriodEnd"]
      ),
      ...domainCsvs,
    };

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      csvFiles,
    };
  };
}
