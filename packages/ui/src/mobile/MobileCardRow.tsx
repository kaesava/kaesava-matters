import React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { CardDrawerIndicator } from "./CardDrawerIndicator";
import { PLATFORM_STYLE } from "./platform-style";

export interface MobileCardRowProps {
  onPress?: () => void;
  onLongPress?: () => void;
  onHaptic?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  children: React.ReactNode;
}

/**
 * Touch-native 44dp+ pressable card row with trailing chevron and optional hold (onLongPress) + haptic feedback.
 */
export function MobileCardRow({
  onPress,
  onLongPress,
  onHaptic,
  showChevron = true,
  accessibilityLabel,
  children,
}: MobileCardRowProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={
        onLongPress
          ? () => {
              onHaptic?.();
              onLongPress();
            }
          : undefined
      }
      accessibilityRole={onPress || onLongPress ? "button" : undefined}
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.row,
        { opacity: pressed && (onPress || onLongPress) ? 0.8 : 1 },
      ]}
    >
      <View style={styles.content}>{children}</View>
      {showChevron && onPress ? <CardDrawerIndicator /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
});
