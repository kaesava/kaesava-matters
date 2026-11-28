import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { FormErrorBanner, FormLabel, MobileButton, MobileInput, MobileLinkButton, MobileLogo, useAppTheme } from "@kaesava/ui/mobile";

export interface MobileSignInCardProps {
  appName: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSignIn: (email: string, password: string) => Promise<void> | void;
  onGoogleSignIn?: () => Promise<void> | void;
  onNavigateSignUp?: () => void;
  onNavigateForgotPassword?: () => void;
}

export function MobileSignInCard({
  appName,
  isSubmitting = false,
  error = null,
  onSignIn,
  onGoogleSignIn,
  onNavigateSignUp,
  onNavigateForgotPassword,
}: MobileSignInCardProps) {
  const { colors } = useAppTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError(t("auth.fillAllFields"));
      return;
    }
    await onSignIn(email.trim(), password);
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <MobileLogo size={40} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>{appName}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("auth.signIn")}</Text>
      </View>
      <FormErrorBanner message={localError || error} />
      {onGoogleSignIn && (
        <MobileButton title={t("auth.signInWithGoogle")} variant="secondary" onPress={onGoogleSignIn} disabled={isSubmitting} />
      )}
      <View style={styles.field}>
        <FormLabel required>{t("auth.emailLabel")}</FormLabel>
        <MobileInput value={email} onChangeText={setEmail} placeholder={t("auth.emailPlaceholder")} keyboardType="email-address" autoCapitalize="none" />
      </View>
      <View style={styles.field}>
        <FormLabel required>{t("auth.passwordLabel")}</FormLabel>
        <MobileInput value={password} onChangeText={setPassword} placeholder={t("auth.passwordPlaceholder")} secureTextEntry />
      </View>
      {onNavigateForgotPassword && (
        <View style={styles.linkRow}>
          <MobileLinkButton label={t("auth.forgotPassword")} onPress={onNavigateForgotPassword} />
        </View>
      )}
      <MobileButton title={t("auth.signInCta")} onPress={handleSubmit} loading={isSubmitting} />
      {onNavigateSignUp && (
        <View style={styles.footerRow}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{t("auth.signUpPrompt")}</Text>
          <MobileLinkButton label={t("auth.signUp")} onPress={onNavigateSignUp} />
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
  linkRow: { alignItems: "flex-end" },
  footerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 4 },
  footerText: { fontSize: 13 },
});
