import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { FormErrorBanner, FormLabel, MobileButton, MobileLinkButton, MobileOtpInput, useAppTheme } from "@kaesava/ui/mobile";

export interface MobileOtpVerificationViewProps {
  email: string;
  isSubmitting?: boolean;
  isResending?: boolean;
  error?: string | null;
  cooldownSeconds?: number;
  onVerify: (otp: string) => Promise<void> | void;
  onResend?: () => Promise<void> | void;
  onEditEmail?: () => void;
}

export function MobileOtpVerificationView({
  email,
  isSubmitting = false,
  isResending = false,
  error = null,
  cooldownSeconds = 0,
  onVerify,
  onResend,
  onEditEmail,
}: MobileOtpVerificationViewProps) {
  const { colors } = useAppTheme();
  const [otp, setOtp] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleVerify = async () => {
    setLocalError(null);
    if (otp.trim().length < 6) {
      setLocalError(t("auth.invalidOtp"));
      return;
    }
    await onVerify(otp.trim());
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t("auth.checkYourEmailTitle")}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{`${t("auth.codeSentTo")} ${email}`}</Text>
      <FormErrorBanner message={localError || error} />
      <FormLabel required>{t("auth.otpLabel")}</FormLabel>
      <MobileOtpInput value={otp} onChangeText={setOtp} />
      <Text style={[styles.note, { color: colors.textMuted }]}>{t("auth.otpExpiryNotice")}</Text>
      <MobileButton title={t("auth.verifyCodeCta")} onPress={handleVerify} loading={isSubmitting} />
      <View style={styles.linksRow}>
        {onResend && (
          <MobileLinkButton
            label={cooldownSeconds > 0 ? t("auth.resendCodeIn", { seconds: String(cooldownSeconds) }) : t("auth.resendCode")}
            onPress={onResend}
            disabled={isResending || cooldownSeconds > 0}
          />
        )}
        {onEditEmail && <MobileLinkButton label={t("auth.editEmail")} onPress={onEditEmail} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  note: { fontSize: 12, lineHeight: 16 },
  linksRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
