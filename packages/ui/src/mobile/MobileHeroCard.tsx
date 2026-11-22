import React from "react";
import { Text, View, StyleSheet } from "react-native";

export interface MobileHeroCardProps {
  title: string;
  primaryValue: React.ReactNode;
  subtitle?: React.ReactNode;
  visualSlot?: React.ReactNode;
  actionSlot?: React.ReactNode;
}

/**
 * Generic home screen hero KPI card container for Mobile.
 */
export function MobileHeroCard({
  title,
  primaryValue,
  subtitle,
  visualSlot,
  actionSlot,
}: MobileHeroCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.main}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.primary}>{primaryValue}</View>
          {subtitle ? <View style={styles.subtitle}>{subtitle}</View> : null}
        </View>
        {visualSlot ? <View>{visualSlot}</View> : null}
      </View>
      {actionSlot ? <View style={styles.action}>{actionSlot}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", backgroundColor: "#ffffff", padding: 16 },
  row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  main: { flex: 1 },
  title: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", color: "#64748b" },
  primary: { marginTop: 4 },
  subtitle: { marginTop: 4 },
  action: { marginTop: 12 },
});
