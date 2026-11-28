import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { evaluatePasswordStrength } from "@kaesava/types";
import { MobilePasswordStrength } from "@kaesava/capability-auth/mobile";
import {
  DESIGN_TOKENS,
  FormErrorBanner,
  FormLabel,
  MobileButton,
  MobileInput,
  MobileLinkButton,
  PLATFORM_STYLE,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { authClient } from "../../lib/auth";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const { token = "" } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleReset = async () => {
    setError(null);
    if (!token) return setError(t("auth.invalidToken"));
    if (evaluatePasswordStrength(password).score < 4) return setError(t("auth.passwordTooShort"));
    if (password !== confirmPassword) return setError(t("auth.passwordsMustMatch"));
    setLoading(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) return setError(res.error.message || t("auth.resetPasswordGenericError"));
      toast.success(t("auth.passwordResetSuccessDesc"));
      router.replace("/(auth)/sign-in" as Href);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resetPasswordGenericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 24, 48), paddingBottom: Math.max(insets.bottom + 24, 48) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t("auth.setNewPasswordTitle")}</Text>
          <FormErrorBanner message={error} />
          <FormLabel required>{t("auth.newPasswordLabel")}</FormLabel>
          <MobileInput value={password} onChangeText={setPassword} placeholder={t("auth.passwordPlaceholder")} secureTextEntry />
          {password.length > 0 && <MobilePasswordStrength password={password} />}
          <FormLabel required>{t("auth.confirmPasswordLabel")}</FormLabel>
          <MobileInput value={confirmPassword} onChangeText={setConfirmPassword} placeholder={t("auth.passwordPlaceholder")} secureTextEntry />
          <MobileButton title={t("auth.resetPasswordButton")} onPress={handleReset} loading={loading} />
          <MobileLinkButton label={t("auth.backToSignIn")} onPress={() => router.replace("/(auth)/sign-in" as Href)} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
  card: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "800", color: DESIGN_TOKENS.colors.textPrimary },
});
