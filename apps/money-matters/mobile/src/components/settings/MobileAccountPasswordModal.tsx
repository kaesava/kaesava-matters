import React from "react";
import { View, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import {
  MobileModalDialog,
  FormLabel,
  MobileInput,
  FormFieldError,
  FormErrorBanner,
  MobileButton,
} from "@kaesava/ui/mobile";
import { MobilePasswordStrength } from "@kaesava/capability-auth/mobile";
import { useMobileAccountPasswordForm } from "./profile/useMobileAccountPasswordForm";

interface MobileAccountPasswordModalProps {
  visible: boolean;
  hasPassword: boolean;
  onClose: () => void;
}

export function MobileAccountPasswordModal({ visible, hasPassword, onClose }: MobileAccountPasswordModalProps) {
  const form = useMobileAccountPasswordForm(visible, hasPassword, onClose);
  const title = hasPassword
    ? t("settings.profile.signInMethods.changePasswordCta")
    : t("settings.profile.signInMethods.setPasswordCta");

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={title}
      isDirty={form.isDirty}
      footer={
        <View style={styles.footer}>
          <MobileButton variant="secondary" title={t("common.cancel")} onPress={onClose} disabled={form.isSubmitting} />
          <MobileButton
            title={title}
            onPress={form.handleSubmit}
            disabled={!form.isDirty || !form.isValid || form.isSubmitting}
            loading={form.isSubmitting}
          />
        </View>
      }
    >
      <View style={styles.body}>
        {form.errorMsg && <FormErrorBanner message={form.errorMsg} />}
        {hasPassword && (
          <View>
            <FormLabel required>{t("settings.profile.signInMethods.currentPasswordLabel")}</FormLabel>
            <MobileInput
              secureTextEntry
              value={form.currentPassword}
              onChangeText={form.setCurrentPassword}
              autoFocus
            />
          </View>
        )}
        <View>
          <FormLabel required>{t("settings.profile.signInMethods.newPasswordLabel")}</FormLabel>
          <MobileInput
            secureTextEntry
            value={form.password}
            onChangeText={form.setPassword}
            autoFocus={!hasPassword}
          />
          {form.password.length > 0 && <MobilePasswordStrength password={form.password} />}
          {form.password.length > 0 && form.password.length < 8 && (
            <FormFieldError error={t("auth.passwordTooShort")} />
          )}
        </View>
        <View>
          <FormLabel required>{t("settings.profile.signInMethods.confirmNewPasswordLabel")}</FormLabel>
          <MobileInput
            secureTextEntry
            value={form.confirmPassword}
            onChangeText={form.setConfirmPassword}
          />
          {form.confirmMismatch && <FormFieldError error={t("auth.passwordsMustMatch")} />}
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: { gap: 14 },
  footer: { flexDirection: "row", justifyContent: "flex-end", gap: 10 },
});
