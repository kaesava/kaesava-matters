import React from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { PLATFORM_STYLE } from "./platform-style";

export interface MobileFilterTriggerButtonProps {
  onPress: () => void;
  activeCount?: number;
  accessibilityLabel: string;
}

/**
 * Standardized filter trigger button with sliders icon and active count badge.
 */
export function MobileFilterTriggerButton({
  onPress,
  activeCount = 0,
  accessibilityLabel,
}: MobileFilterTriggerButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={styles.button}
    >
      <Feather name="sliders" size={18} color={DESIGN_TOKENS.colors.textPrimary} />
      {activeCount > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: PLATFORM_STYLE.minTouch,
    minHeight: PLATFORM_STYLE.minTouch,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    paddingHorizontal: 10,
  },
  badge: {
    marginLeft: 6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: DESIGN_TOKENS.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  badgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
