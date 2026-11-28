import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { InviteAcceptFlowProps } from "../ui-contracts.js";

export function MobileInviteAcceptFlow({
  inviteDetails,
  isLoading = false,
  isAccepting = false,
  onAccept,
  onSignOut,
  onReturnHome,
}: InviteAcceptFlowProps) {
  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator />
        <Text style={styles.subtitle}>{t("memberInvite.acceptSubtitle")}</Text>
      </View>
    );
  }

  if (inviteDetails.status !== "VALID") {
    const errorKey =
      inviteDetails.status === "EXPIRED"
        ? "memberInvite.inviteExpiredError"
        : inviteDetails.status === "ALREADY_ACCEPTED"
          ? "memberInvite.inviteAlreadyAccepted"
          : "auth.invalidToken";
    return (
      <View style={styles.card}>
        <Text style={styles.errorText}>{t(errorKey)}</Text>
        {onReturnHome && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onReturnHome} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t("common.back")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  if (inviteDetails.emailMismatch) {
    return (
      <View style={styles.card}>
        <Text style={styles.warnText}>{t("memberInvite.wrongAccountPrivacyHint")}</Text>
        {onSignOut && (
          <TouchableOpacity style={styles.secondaryBtn} onPress={onSignOut} accessibilityRole="button">
            <Text style={styles.secondaryText}>{t("settings.signOut")}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("memberInvite.joinHouseholdNamedSubtitle", { householdName: inviteDetails.householdName })}</Text>
      <Text style={styles.subtitle}>{`${t("memberInvite.invitedEmailLabel")}: ${inviteDetails.inviteEmail}`}</Text>
      <TouchableOpacity style={styles.primaryBtn} disabled={isAccepting} onPress={onAccept} accessibilityRole="button">
        <Text style={styles.primaryText}>{isAccepting ? t("common.loading") : t("notifications.inngest.acceptInviteCta")}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 20, borderWidth: 1, borderColor: "#e2e8f0", gap: 12, alignItems: "center" },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#64748b", textAlign: "center" },
  errorText: { fontSize: 14, color: "#dc2626", textAlign: "center" },
  warnText: { fontSize: 14, color: "#b45309", textAlign: "center" },
  primaryBtn: { width: "100%", minHeight: 44, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  primaryText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  secondaryBtn: { width: "100%", minHeight: 44, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1", alignItems: "center", justifyContent: "center" },
  secondaryText: { fontSize: 14, fontWeight: "600", color: "#0f172a" },
});
