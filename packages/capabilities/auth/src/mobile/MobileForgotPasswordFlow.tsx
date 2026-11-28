import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { evaluatePasswordStrength } from "@kaesava/types";
import { FormErrorBanner, FormLabel, MobileButton, MobileInput, MobileLinkButton, MobileOtpInput, useAppTheme } from "@kaesava/ui/mobile";
import { MobilePasswordStrength } from "./MobilePasswordStrength";

export interface MobileForgotPasswordFlowProps {
  isSubmitting?: boolean;
  error?: string | null;
  onSendCode: (email: string) => Promise<boolean> | boolean;
  onResetPassword: (data: { email: string; otp: string; newPassword: string }) => Promise<void> | void;
  onBackToSignIn?: () => void;
}

export function MobileForgotPasswordFlow({
  isSubmitting = false,
  error = null,
  onSendCode,
  onResetPassword,
  onBackToSignIn,
}: MobileForgotPasswordFlowProps) {
  const { colors } = useAppTheme();
  const [step, setStep] = useState<"email" | "reset">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSend = async () => {
    setLocalError(null);
    if (!email.trim()) return setLocalError(t("auth.fillAllFields"));
    const ok = await onSendCode(email.trim());
    if (ok) setStep("reset");
  };

  const handleReset = async () => {
    setLocalError(null);
    if (otp.trim().length < 6) return setLocalError(t("auth.invalidOtp"));
    if (evaluatePasswordStrength(newPassword).score < 4) return setLocalError(t("auth.passwordTooShort"));
    await onResetPassword({ email: email.trim(), otp: otp.trim(), newPassword });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {step === "email" ? t("auth.forgotPasswordTitle") : t("auth.setNewPasswordTitle")}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        {step === "email" ? t("auth.forgotPasswordSubtitle") : `${t("auth.codeSentTo")} ${email}`}
      </Text>
      <FormErrorBanner message={localError || error} />
      {step === "email" ? (
        <>
          <FormLabel required>{t("auth.emailLabel")}</FormLabel>
          <MobileInput value={email} onChangeText={setEmail} placeholder={t("auth.emailPlaceholder")} keyboardType="email-address" autoCapitalize="none" />
          <MobileButton title={t("auth.sendResetCode")} onPress={handleSend} loading={isSubmitting} />
        </>
      ) : (
        <>
          <FormLabel required>{t("auth.otpLabel")}</FormLabel>
          <MobileOtpInput value={otp} onChangeText={setOtp} />
          <FormLabel required>{t("auth.newPasswordLabel")}</FormLabel>
          <MobileInput value={newPassword} onChangeText={setNewPassword} placeholder={t("auth.passwordPlaceholder")} secureTextEntry />
          {newPassword.length > 0 && <MobilePasswordStrength password={newPassword} />}
          <MobileButton title={t("auth.resetPasswordButton")} onPress={handleReset} loading={isSubmitting} />
          <MobileLinkButton label={t("auth.editEmail")} onPress={() => setStep("email")} />
        </>
      )}
      {onBackToSignIn && <MobileLinkButton label={t("auth.backToSignIn")} onPress={onBackToSignIn} />}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18 },
});
