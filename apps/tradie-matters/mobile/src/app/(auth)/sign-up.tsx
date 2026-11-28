import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";
import { MobileOtpVerificationView, MobileSignUpCard } from "@kaesava/capability-auth/mobile";
import { authClient } from "../../lib/auth";
import { setActiveSessionToken } from "../../lib/trpc";

export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<{ email: string; password: string } | null>(null);

  const handleSignUp = async (data: { name: string; email: string; password: string }) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signUp.email(data);
      if (res.error) return setError(res.error.message || t("common.errorTryAgain"));
      await authClient.emailOtp.sendVerificationOtp({ email: data.email, type: "email-verification" });
      setPending({ email: data.email, password: data.password });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.errorTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError(null);
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: "tradiematters://auth-callback",
    });
    if (res.error) setError(res.error.message || t("common.errorTryAgain"));
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!pending) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.emailOtp.verifyEmail({ email: pending.email, otp });
      if (res.error) return setError(res.error.message || t("auth.invalidOtp"));
      const signInRes = await authClient.signIn.email(pending);
      if (signInRes.data?.token) setActiveSessionToken(signInRes.data.token);
      router.replace("/(auth)/complete-profile" as Href);
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
        {pending ? (
          <MobileOtpVerificationView
            email={pending.email}
            isSubmitting={loading}
            error={error}
            onVerify={handleVerifyOtp}
            onResend={async () => {
              await authClient.emailOtp.sendVerificationOtp({
                email: pending.email,
                type: "email-verification",
              });
            }}
            onEditEmail={() => setPending(null)}
          />
        ) : (
          <MobileSignUpCard
            appName={t("tradieMobile.appName")}
            isSubmitting={loading}
            error={error}
            onSignUp={handleSignUp}
            onGoogleSignUp={handleGoogleSignUp}
            onNavigateSignIn={() => router.replace("/(auth)/sign-in" as Href)}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
});
