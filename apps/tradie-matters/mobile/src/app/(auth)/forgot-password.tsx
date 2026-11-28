import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE, useMobileToast } from "@kaesava/ui/mobile";
import { MobileForgotPasswordFlow } from "@kaesava/capability-auth/mobile";
import { authClient } from "../../lib/auth";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async (email: string): Promise<boolean> => {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({ email, type: "forget-password" });
      if (res.error) {
        setError(res.error.message || t("common.errorTryAgain"));
        return false;
      }
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.errorTryAgain"));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (data: { email: string; otp: string; newPassword: string }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.emailOtp.resetPassword({
        email: data.email,
        otp: data.otp,
        password: data.newPassword,
      });
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
        <MobileForgotPasswordFlow
          isSubmitting={loading}
          error={error}
          onSendCode={handleSendCode}
          onResetPassword={handleResetPassword}
          onBackToSignIn={() => router.replace("/(auth)/sign-in" as Href)}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
});
