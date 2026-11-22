import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { DESIGN_TOKENS } from "../tokens";

export interface SetupProgressBarProps {
  currentStep: number;
  totalSteps: number;
  stepTitle?: string;
}

/**
 * Generic multi-step wizard progress bar for Mobile.
 */
export function SetupProgressBar({ currentStep, totalSteps, stepTitle }: SetupProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((currentStep / Math.max(1, totalSteps)) * 100)));
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {stepTitle ? <Text style={styles.title}>{stepTitle}</Text> : <View />}
        <Text style={styles.counter}>
          {currentStep} / {totalSteps}
        </Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  title: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  counter: { fontSize: 12, fontWeight: "500", color: "#64748b" },
  track: { height: 6, borderRadius: 3, backgroundColor: "#e2e8f0", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3, backgroundColor: DESIGN_TOKENS.colors.primary },
});
