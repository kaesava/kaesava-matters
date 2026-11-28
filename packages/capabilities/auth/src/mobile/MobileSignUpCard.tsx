import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { evaluatePasswordStrength } from "@kaesava/types";
import { FormErrorBanner, FormLabel, MobileButton, MobileCheckbox, MobileInput, MobileLinkButton, MobileLogo, useAppTheme } from "@kaesava/ui/mobile";
import { MobilePasswordStrength } from "./MobilePasswordStrength";

export interface MobileSignUpCardProps {
  appName: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSignUp: (data: { name: string; email: string; password: string }) => Promise<void> | void;
  onGoogleSignUp?: () => Promise<void> | void;
  onNavigateSignIn?: () => void;
}

export function MobileSignUpCard({
  appName,
  isSubmitting = false,
  error = null,
  onSignUp,
  onGoogleSignUp,
  onNavigateSignIn,
}: MobileSignUpCardProps) {
  const { colors } = useAppTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!name.trim() || !email.trim() || !password) {
      setLocalError(t("auth.fillAllFields"));
      return;
    }
    if (evaluatePasswordStrength(password).score < 4) {
      setLocalError(t("auth.passwordTooShort"));
      return;
    }
    if (!agreed) {
      setLocalError(t("auth.mustAgreeToTerms"));
      return;
    }
    await onSignUp({ name: name.trim(), email: email.trim(), password });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <MobileLogo size={40} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{appName}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("auth.signUp")}</Text>
      </View>
      <FormErrorBanner message={localError || error} />
      {onGoogleSignUp && (
        <MobileButton title={t("auth.signUpWithGoogle")} variant="secondary" onPress={onGoogleSignUp} disabled={isSubmitting} />
      )}
      <View style={styles.field}>
        <FormLabel required>{t("auth.nameLabel")}</FormLabel>
        <MobileInput value={name} onChangeText={setName} placeholder={t("auth.namePlaceholder")} />
      </View>
      <View style={styles.field}>
        <FormLabel required>{t("auth.emailLabel")}</FormLabel>
        <MobileInput value={email} onChangeText={setEmail} placeholder={t("auth.emailPlaceholder")} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.field}>
        <FormLabel required>{t("auth.passwordLabel")}</FormLabel>
        <MobileInput value={password} onChangeText={setPassword} placeholder={t("auth.passwordPlaceholder")} secureTextEntry />
        {password.length > 0 && <MobilePasswordStrength password={password} />}
      </View>
      <MobileCheckbox checked={agreed} onChange={setAgreed} label={`${t("auth.agreeTermsPrefix")} ${t("auth.termsLink")} ${t("auth.agreeTermsAnd")} ${t("auth.privacyLink")}`} />
      <MobileButton title={t("auth.signUp")} onPress={handleSubmit} loading={isSubmitting} />
      {onNavigateSignIn && (
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{t("auth.signInPrompt")}</Text>
          <MobileLinkButton label={t("auth.signIn")} onPress={onNavigateSignIn} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  header: { alignItems: "center", gap: 6, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { fontSize: 14, fontWeight: "600" },
  field: { gap: 4 },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 },
  footerText: { fontSize: 13 },
});
