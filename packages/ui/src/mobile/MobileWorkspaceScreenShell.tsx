import React from "react";
import { StyleSheet, View } from "react-native";
import { ScreenWrapper, type ScreenWrapperProps } from "./ScreenWrapper";
import { OfflineSyncBadge, type OfflineSyncStatus } from "./OfflineSyncBadge";

export interface MobileWorkspaceScreenShellProps extends ScreenWrapperProps {
  syncStatus?: OfflineSyncStatus;
  syncLabel?: string;
  pendingSyncCount?: number;
  onSyncPress?: () => void;
  topBannerSlot?: React.ReactNode;
}

export function MobileWorkspaceScreenShell({
  syncStatus,
  syncLabel,
  pendingSyncCount,
  onSyncPress,
  topBannerSlot,
  children,
  ...wrapperProps
}: MobileWorkspaceScreenShellProps) {
  return (
    <ScreenWrapper {...wrapperProps}>
      {(syncStatus || topBannerSlot) && (
        <View style={styles.metaRow}>
          {syncStatus ? (
            <OfflineSyncBadge
              status={syncStatus}
              label={syncLabel}
              pendingCount={pendingSyncCount}
              onPress={onSyncPress}
            />
          ) : null}
          {topBannerSlot}
        </View>
      )}
      {children}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 12,
  },
});
