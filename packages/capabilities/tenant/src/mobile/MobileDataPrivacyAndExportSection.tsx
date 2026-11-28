import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { DataPrivacyAndExportProps } from "../ui-contracts.js";

export function MobileDataPrivacyAndExportSection({
  telemetryConsent,
  isExporting = false,
  onToggleTelemetry,
  onExportData,
  onOpenPrivacyPolicy,
}: DataPrivacyAndExportProps) {
  const isGranted = telemetryConsent === "granted";

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("privacy.title")}</Text>
      <Text style={styles.body}>{t("privacy.aussiePrivacyDetail")}</Text>
      <TouchableOpacity style={styles.toggleRow} onPress={() => onToggleTelemetry(!isGranted)} accessibilityRole="button">
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>{t("privacy.analyticsConsentToggle")}</Text>
          <Text style={styles.toggleDesc}>{t("privacy.analyticsConsentToggleDesc")}</Text>
        </View>
        <View style={[styles.pill, isGranted ? styles.pillOn : styles.pillOff]}>
          <Text style={[styles.pillText, isGranted ? styles.pillTextOn : styles.pillTextOff]}>
            {isGranted ? t("privacy.analyticsConsentAccept") : t("privacy.analyticsConsentDecline")}
          </Text>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.exportBtn} disabled={isExporting} onPress={onExportData} accessibilityRole="button">
        <Text style={styles.exportText}>{isExporting ? t("common.loading") : t("privacy.exportZipButton")}</Text>
      </TouchableOpacity>
      {onOpenPrivacyPolicy && (
        <TouchableOpacity style={styles.linkBtn} onPress={onOpenPrivacyPolicy} accessibilityRole="button">
          <Text style={styles.linkText}>{t("privacy.viewPublicPrivacyPolicyLink")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 10 },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  body: { fontSize: 13, color: "#475569" },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 44, paddingVertical: 8, gap: 10 },
  toggleInfo: { flex: 1 },
  toggleTitle: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  toggleDesc: { fontSize: 12, color: "#64748b" },
  pill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  pillOn: { backgroundColor: "#2563eb" },
  pillOff: { backgroundColor: "#e2e8f0" },
  pillText: { fontSize: 11, fontWeight: "600" },
  pillTextOn: { color: "#ffffff" },
  pillTextOff: { color: "#334155" },
  exportBtn: { minHeight: 44, borderRadius: 8, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  exportText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  linkBtn: { minHeight: 44, justifyContent: "center", alignItems: "center" },
  linkText: { fontSize: 13, fontWeight: "500", color: "#2563eb" },
});
