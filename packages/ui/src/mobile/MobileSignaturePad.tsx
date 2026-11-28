import React, { useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS } from "../tokens";
import { PLATFORM_STYLE, getRipple } from "./platform-style";

export interface MobileSignaturePadProps {
  onChange?: (paths: string[]) => void;
  height?: number;
  clearLabel?: string;
  disabled?: boolean;
}

export function MobileSignaturePad({ onChange, height = 180, clearLabel, disabled = false }: MobileSignaturePadProps) {
  const [paths, setPaths] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");
  const currentPathRef = useRef("");
  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !disabledRef.current,
        onMoveShouldSetPanResponder: () => !disabledRef.current,
        onPanResponderGrant: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const start = `M${locationX.toFixed(1)},${locationY.toFixed(1)}`;
          currentPathRef.current = start;
          setCurrentPath(start);
        },
        onPanResponderMove: (e) => {
          const { locationX, locationY } = e.nativeEvent;
          const next = `${currentPathRef.current} L${locationX.toFixed(1)},${locationY.toFixed(1)}`;
          currentPathRef.current = next;
          setCurrentPath(next);
        },
        onPanResponderRelease: () => {
          const finished = currentPathRef.current;
          if (!finished) return;
          currentPathRef.current = "";
          setCurrentPath("");
          setPaths((prev) => {
            const updated = [...prev, finished];
            onChange?.(updated);
            return updated;
          });
        },
      }),
    [onChange]
  );

  const handleClear = () => {
    currentPathRef.current = "";
    setCurrentPath("");
    setPaths([]);
    onChange?.([]);
  };

  return (
    <View style={styles.container}>
      <View style={[styles.canvas, { height }]} {...panResponder.panHandlers}>
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((d, i) => (
            <Path key={i} d={d} stroke={DESIGN_TOKENS.colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {currentPath ? <Path d={currentPath} stroke={DESIGN_TOKENS.colors.primary} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        </Svg>
      </View>
      <View style={styles.footer}>
        <Pressable onPress={handleClear} disabled={disabled || paths.length === 0} android_ripple={getRipple()} accessibilityRole="button" accessibilityLabel={clearLabel ?? t("common.clear")} style={[styles.clearBtn, (disabled || paths.length === 0) && styles.disabled]}>
          <Text style={styles.clearText}>{clearLabel ?? t("common.clear")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  canvas: { width: "100%", borderRadius: 12, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], backgroundColor: DESIGN_TOKENS.colors.surface, overflow: "hidden" },
  footer: { flexDirection: "row", justifyContent: "flex-end" },
  clearBtn: { minHeight: PLATFORM_STYLE.minTouch, minWidth: PLATFORM_STYLE.minTouch, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], alignItems: "center", justifyContent: "center" },
  clearText: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.slate[600] },
  disabled: { opacity: 0.4 },
});
