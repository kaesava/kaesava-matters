import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { TenantDangerZoneProps } from "../ui-contracts.js";

export function MobileTenantDangerZoneSection({
  isOwner,
  isSoleOwner,
  isSubmitting = false,
  onLeave,
  onDelete,
}: Omit<TenantDangerZoneProps, "tenantName">) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("settings.dangerZone.title")}</Text>
      <Text style={styles.subtitle}>{t("settings.dangerZone.subtitle")}</Text>
      {(!isOwner || !isSoleOwner) && (
        <TouchableOpacity style={styles.leaveBtn} disabled={isSubmitting} onPress={onLeave} accessibilityRole="button">
          <Text style={styles.leaveText}>{t("settings.dangerZone.leaveCta")}</Text>
        </TouchableOpacity>
      )}
      {isOwner && (
        <TouchableOpacity style={styles.deleteBtn} disabled={isSubmitting} onPress={onDelete} accessibilityRole="button">
          <Text style={styles.deleteText}>{t("settings.dangerZone.deleteCta")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#fef2f2", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#fecaca", gap: 10 },
  title: { fontSize: 16, fontWeight: "600", color: "#b91c1c" },
  subtitle: { fontSize: 13, color: "#475569" },
  leaveBtn: { minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: "#fca5a5", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  leaveText: { fontSize: 14, fontWeight: "600", color: "#b91c1c" },
  deleteBtn: { minHeight: 44, borderRadius: 8, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  deleteText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});
