import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { TenantDetailsProps } from "../ui-contracts.js";

export interface MobileTenantDetailsProps extends Omit<TenantDetailsProps, "onSave"> {
  onPressEdit?: () => void;
}

export function MobileTenantDetailsSection({
  tenantName,
  country,
  currency,
  timezone,
  state,
  postcode,
  isOwner,
  onPressEdit,
}: MobileTenantDetailsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("settings.householdProfileAndLocation")}</Text>
      <Text style={styles.label}>{t("settings.householdNameLabel")}</Text>
      <Text style={styles.value}>{tenantName}</Text>
      <Text style={styles.label}>{t("settings.timezone")}</Text>
      <Text style={styles.value}>{timezone}</Text>
      <Text style={styles.meta}>{`${t("settings.countryLabel")}: ${country} · ${t("settings.currency")}: ${currency}`}</Text>
      {(state || postcode) && (
        <Text style={styles.meta}>{[state, postcode].filter(Boolean).join(" ")}</Text>
      )}
      {isOwner && onPressEdit && (
        <TouchableOpacity style={styles.button} onPress={onPressEdit} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("settings.editHouseholdTitle")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 6 },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a", marginBottom: 4 },
  label: { fontSize: 12, color: "#64748b", marginTop: 4 },
  value: { fontSize: 14, color: "#0f172a", fontWeight: "500" },
  meta: { fontSize: 12, color: "#475569", marginTop: 4 },
  button: { marginTop: 12, minHeight: 44, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});
