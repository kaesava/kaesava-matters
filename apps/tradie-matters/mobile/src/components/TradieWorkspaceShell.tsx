import React from "react";
import { t } from "@kaesava/i18n";
import { useOutboxSync } from "@kaesava/mobile-core";
import {
  MobileWorkspaceScreenShell,
  type MobileWorkspaceScreenShellProps,
  type OfflineSyncStatus,
} from "@kaesava/ui/mobile";

type TradieWorkspaceShellProps = Omit<
  MobileWorkspaceScreenShellProps,
  "syncStatus" | "syncLabel" | "pendingSyncCount" | "onSyncPress"
>;

export function TradieWorkspaceShell({ children, ...props }: TradieWorkspaceShellProps) {
  const { isOnline, isSyncing, pendingCount, syncNow } = useOutboxSync();

  const syncStatus: OfflineSyncStatus = isSyncing
    ? "syncing"
    : !isOnline
      ? "offline"
      : pendingCount > 0
        ? "pending"
        : "online";

  const syncLabel =
    syncStatus === "syncing"
      ? t("tradieMobile.syncSyncingLabel")
      : syncStatus === "offline"
        ? t("tradieMobile.syncOfflineLabel")
        : syncStatus === "pending"
          ? t("tradieMobile.syncPendingLabel", { count: String(pendingCount) })
          : t("tradieMobile.syncOnlineLabel");

  return (
    <MobileWorkspaceScreenShell
      {...props}
      syncStatus={syncStatus}
      syncLabel={syncLabel}
      pendingSyncCount={pendingCount}
      onSyncPress={() => void syncNow()}
    >
      {children}
    </MobileWorkspaceScreenShell>
  );
}
