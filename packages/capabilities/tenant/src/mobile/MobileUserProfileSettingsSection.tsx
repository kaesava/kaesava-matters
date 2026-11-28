import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { UserProfileSettingsProps } from "../ui-contracts.js";

export interface MobileUserProfileSettingsProps extends Omit<UserProfileSettingsProps, "onSave"> {
  onPressEdit?: () => void;
}

export function MobileUserProfileSettingsSection({
  displayName,
  loginEmail,
  notificationEmail,
  phoneNumber,
  onPressEdit,
}: MobileUserProfileSettingsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("settings.myDetailsTitle")}</Text>
      <Text style={styles.label}>{t("common.name")}</Text>
      <Text style={styles.value}>{displayName || "-"}</Text>
      <Text style={styles.label}>{t("settings.loginEmailLabel")}</Text>
      <Text style={styles.value}>{loginEmail}</Text>
      <Text style={styles.label}>{t("settings.notificationEmailLabel")}</Text>
      <Text style={styles.value}>{notificationEmail}</Text>
      {phoneNumber ? (
        <>
          <Text style={styles.label}>{t("settings.phoneNumberLabel")}</Text>
          <Text style={styles.value}>{phoneNumber}</Text>
        </>
      ) : null}
      {onPressEdit && (
        <TouchableOpacity style={styles.button} onPress={onPressEdit} accessibilityRole="button">
          <Text style={styles.buttonText}>{t("settings.editProfileTitle")}</Text>
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
  button: { marginTop: 12, minHeight: 44, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  buttonText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});
