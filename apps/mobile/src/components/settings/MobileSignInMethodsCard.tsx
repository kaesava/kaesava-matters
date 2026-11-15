import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS, SettingsCard, MobileBadge, MobileButton } from "@money-matters/ui/mobile";
import { useMobileSignInMethods } from "./profile/useMobileSignInMethods";
import { MobileAccountPasswordModal } from "./MobileAccountPasswordModal";

export function MobileSignInMethodsCard() {
  const sm = useMobileSignInMethods();

  return (
    <>
      <SettingsCard title={t("settings.profile.signInMethods.title")}>
        <Text style={styles.subtitle}>{t("settings.profile.signInMethods.subtitle")}</Text>
        <View style={styles.list}>
          <View style={styles.row}>
            <View style={styles.labelGroup}>
              <Text style={styles.rowLabel}>{t("settings.profile.signInMethods.emailPasswordLabel")}</Text>
              {!sm.isLoading && (
                <MobileBadge variant={sm.hasPassword ? "success" : "primary"}>
                  {sm.hasPassword
                    ? t("settings.profile.signInMethods.passwordSet")
                    : t("settings.profile.signInMethods.passwordNotSet")}
                </MobileBadge>
              )}
            </View>
            <MobileButton
              variant="secondary"
              size="sm"
              title={
                sm.hasPassword
                  ? t("settings.profile.signInMethods.changePasswordCta")
                  : t("settings.profile.signInMethods.setPasswordCta")
              }
              disabled={sm.isLoading}
              onPress={() => sm.setIsPasswordModalOpen(true)}
            />
          </View>

          <View style={styles.googleBlock}>
            <View style={styles.row}>
              <View style={styles.labelGroup}>
                <Text style={styles.rowLabel}>{t("settings.profile.signInMethods.googleLabel")}</Text>
                {!sm.isLoading && (
                  <MobileBadge variant={sm.hasGoogle ? "success" : "primary"}>
                    {sm.hasGoogle
                      ? t("settings.profile.signInMethods.connected")
                      : t("settings.profile.signInMethods.notConnected")}
                  </MobileBadge>
                )}
              </View>
              {sm.hasGoogle ? (
                <MobileButton
                  variant="secondary"
                  size="sm"
                  title={t("settings.profile.signInMethods.disconnectGoogleCta")}
                  disabled={sm.isLoading || !sm.hasPassword || sm.isDisconnectingGoogle}
                  onPress={sm.handleDisconnectGoogle}
                />
              ) : (
                <MobileButton
                  variant="secondary"
                  size="sm"
                  title={t("settings.profile.signInMethods.connectGoogleCta")}
                  disabled={sm.isLoading || sm.isLinkingGoogle}
                  loading={sm.isLinkingGoogle}
                  onPress={sm.handleConnectGoogle}
                />
              )}
            </View>
            {!sm.isLoading && sm.hasGoogle && !sm.hasPassword && (
              <Text style={styles.hint}>{t("settings.profile.signInMethods.setPasswordFirstHint")}</Text>
            )}
          </View>
        </View>
      </SettingsCard>

      <MobileAccountPasswordModal
        visible={sm.isPasswordModalOpen}
        hasPassword={sm.hasPassword}
        onClose={() => sm.setIsPasswordModalOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: { fontSize: 12, color: "#64748B", marginBottom: 12 },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  googleBlock: { gap: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#F1F5F9" },
  labelGroup: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, flexWrap: "wrap" },
  rowLabel: { fontSize: 13, fontWeight: "700", color: DESIGN_TOKENS.colors.primary },
  hint: { fontSize: 11, color: "#64748B" },
});
