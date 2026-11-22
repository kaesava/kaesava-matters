import React from "react";
import { RefreshControl } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export interface MobilePullToRefreshProps {
  refreshing: boolean;
  onRefresh: () => void;
  tintColor?: string;
}

/**
 * Standardized RefreshControl element for Mobile ScrollView / FlatList.
 */
export function createMobileRefreshControl({
  refreshing,
  onRefresh,
  tintColor = DESIGN_TOKENS.colors.primary,
}: MobilePullToRefreshProps) {
  return (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={tintColor}
      colors={[tintColor]}
    />
  );
}
