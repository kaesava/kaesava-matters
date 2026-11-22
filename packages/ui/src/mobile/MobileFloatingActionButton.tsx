import React from "react";
import { Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "../tokens";
import { PLATFORM_STYLE } from "./platform-style";

export interface MobileFloatingActionButtonProps {
  onPress: () => void;
  accessibilityLabel: string;
  onHaptic?: () => void;
  bottomOffset?: number;
}

/**
 * Generic 56dp+ floating `+` action button for Mobile.
 */
export function MobileFloatingActionButton({
  onPress,
  accessibilityLabel,
  onHaptic,
  bottomOffset = 20,
}: MobileFloatingActionButtonProps) {
  return (
    <Pressable
      onPress={() => {
        onHaptic?.();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      android_ripple={{ color: "rgba(255,255,255,0.25)", borderless: true }}
      style={({ pressed }) => [
        styles.fab,
        { bottom: bottomOffset, opacity: pressed ? 0.88 : 1 },
      ]}
    >
      <Feather name="plus" size={26} color="#ffffff" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: Math.max(56, PLATFORM_STYLE.minTouch),
    height: Math.max(56, PLATFORM_STYLE.minTouch),
    borderRadius: 28,
    backgroundColor: DESIGN_TOKENS.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
  },
});
