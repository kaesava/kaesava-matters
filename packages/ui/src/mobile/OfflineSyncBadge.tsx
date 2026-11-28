import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { PLATFORM_STYLE, getRipple } from "./platform-style";

export type OfflineSyncStatus = "online" | "offline" | "syncing" | "pending";

export interface OfflineSyncBadgeProps {
  status: OfflineSyncStatus;
  label?: string;
  pendingCount?: number;
  onPress?: () => void;
}

const STATUS_STYLE: Record<
  OfflineSyncStatus,
  { bg: string; border: string; text: string; icon: keyof typeof Feather.glyphMap; fallback: string }
> = {
  online: {
    bg: DESIGN_TOKENS.colors.successLight,
    border: DESIGN_TOKENS.colors.successBorder,
    text: DESIGN_TOKENS.colors.successDark,
    icon: "check-circle",
    fallback: "Synced",
  },
  offline: {
    bg: DESIGN_TOKENS.colors.warningLight,
    border: DESIGN_TOKENS.colors.warningBorder,
    text: DESIGN_TOKENS.colors.warningDark,
    icon: "wifi-off",
    fallback: "Offline",
  },
  syncing: {
    bg: DESIGN_TOKENS.colors.accentLight,
    border: DESIGN_TOKENS.colors.accentBorder,
    text: DESIGN_TOKENS.colors.accentDark,
    icon: "refresh-cw",
    fallback: "Syncing",
  },
  pending: {
    bg: DESIGN_TOKENS.colors.warningLight,
    border: DESIGN_TOKENS.colors.warningBorder,
    text: DESIGN_TOKENS.colors.warningDark,
    icon: "clock",
    fallback: "Pending",
  },
};

export function OfflineSyncBadge({
  status,
  label,
  pendingCount,
  onPress,
}: OfflineSyncBadgeProps) {
  const cfg = STATUS_STYLE[status];
  const displayLabel =
    label ??
    (pendingCount && pendingCount > 0 ? `${cfg.fallback} (${pendingCount})` : cfg.fallback);

  const badge = (
    <View style={[styles.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Feather name={cfg.icon} size={12} color={cfg.text} />
      <Text style={[styles.badgeText, { color: cfg.text }]}>{displayLabel}</Text>
    </View>
  );

  if (!onPress) return badge;
  return (
    <Pressable
      onPress={onPress}
      android_ripple={getRipple()}
      accessibilityRole="button"
      accessibilityLabel={displayLabel}
      style={styles.touchWrap}
    >
      {badge}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchWrap: {
    minHeight: PLATFORM_STYLE.minTouch,
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
