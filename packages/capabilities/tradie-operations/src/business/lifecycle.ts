import { and, eq, isNull } from "drizzle-orm";
import {
  tenants,
  tmBusinessProfiles,
  tmTeamMemberProfiles,
  type DbOrTx,
} from "@kaesava/db/rings/tradie-matters";
import type { TenantLifecycleHooks } from "@kaesava/types";
import { countTenantSeats, evaluateSeatEntitlement } from "../rbac/entitlements.js";
import { getBusinessProfileQuery } from "./queries.js";
import { upsertBusinessProfileRow, upsertTeamMemberProfileCommand } from "./commands.js";
import {
  applyInvoiceLegalHoldOnTenantDelete,
  exportTradieTenantData,
  listTradieArchivedItems,
  restoreTradieArchivedItem,
} from "./lifecycle-data.js";

async function archiveMemberProfile(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  targetUserId: string,
  actorUserId: string
): Promise<void> {
  const now = new Date();
  await db
    .update(tmTeamMemberProfiles)
    .set({ archivedAt: now, archivedBy: actorUserId, updatedAt: now, updatedBy: actorUserId })
    .where(
      and(
        eq(tmTeamMemberProfiles.tenantId, tenantId),
        eq(tmTeamMemberProfiles.appId, appId),
        eq(tmTeamMemberProfiles.userId, targetUserId),
        isNull(tmTeamMemberProfiles.archivedAt)
      )
    );
}

async function archiveTenantProfiles(
  db: DbOrTx,
  tenantId: string,
  appId: string,
  actorUserId: string
): Promise<void> {
  const now = new Date();
  await db
    .update(tmBusinessProfiles)
    .set({ archivedAt: now, archivedBy: actorUserId, updatedAt: now, updatedBy: actorUserId })
    .where(
      and(
        eq(tmBusinessProfiles.tenantId, tenantId),
        eq(tmBusinessProfiles.appId, appId),
        isNull(tmBusinessProfiles.archivedAt)
      )
    );
  await db
    .update(tmTeamMemberProfiles)
    .set({ archivedAt: now, archivedBy: actorUserId, updatedAt: now, updatedBy: actorUserId })
    .where(
      and(
        eq(tmTeamMemberProfiles.tenantId, tenantId),
        eq(tmTeamMemberProfiles.appId, appId),
        isNull(tmTeamMemberProfiles.archivedAt)
      )
    );
}

export function createTradieTenantLifecycleHooks(): TenantLifecycleHooks<DbOrTx> {
  return {
    async onTenantCreated({ db, tenantId, appId, userId }) {
      await upsertBusinessProfileRow(db, { tenantId, appId, userId }, {});
      await upsertTeamMemberProfileCommand(
        db,
        { tenantId, appId, actorUserId: userId },
        { userId, isFieldActive: true }
      );
    },
    async onSetupCancelled({ db, tenantId, appId, userId }) {
      await upsertBusinessProfileRow(db, { tenantId, appId, userId }, {});
    },
    async onEnrichTenantDetails({ db, tenantId, appId }) {
      const businessProfile = await getBusinessProfileQuery(db, tenantId, appId);
      return { businessProfile };
    },
    async onBeforeMemberInvite({ db, tenantId, role, appRole }) {
      const [tenant] = await db
        .select({ planType: tenants.planType })
        .from(tenants)
        .where(eq(tenants.id, tenantId))
        .limit(1);
      const counts = await countTenantSeats(db, tenantId);
      const check = evaluateSeatEntitlement({
        planType: tenant?.planType,
        activeMemberSeats: counts.activeMemberSeats,
        freeViewerSeats: counts.freeViewerSeats,
        targetBaseRole: role === "VIEWER" ? "VIEWER" : role === "OWNER" ? "OWNER" : "MEMBER",
        targetAppRole: appRole,
      });
      if (!check.allowed) throw new Error(check.reason ?? "Seat limit reached.");
    },
    async onMemberJoined({ db, tenantId, appId, userId }) {
      await upsertTeamMemberProfileCommand(
        db,
        { tenantId, appId, actorUserId: userId },
        { userId, isFieldActive: true }
      );
    },
    async onMemberRemoved({ db, tenantId, appId, userId, removedUserId }) {
      await archiveMemberProfile(db, tenantId, appId, removedUserId, userId);
    },
    async onMemberLeft({ db, tenantId, appId, userId }) {
      await archiveMemberProfile(db, tenantId, appId, userId, userId);
    },
    async onTenantDeleting({ db, tenantId, appId, userId }) {
      await applyInvoiceLegalHoldOnTenantDelete(db, tenantId, appId, userId);
      await archiveTenantProfiles(db, tenantId, appId, userId);
    },
    async onListArchivedItems({ db, tenantId, appId }) {
      return listTradieArchivedItems(db, tenantId, appId);
    },
    async onRestoreArchivedItem({ db, tenantId, appId, userId, itemId, itemType }) {
      return restoreTradieArchivedItem(db, tenantId, appId, userId, itemId, itemType);
    },
    async onExportTenantData({ db, tenantId, appId }) {
      return exportTradieTenantData(db, tenantId, appId);
    },
  };
}
