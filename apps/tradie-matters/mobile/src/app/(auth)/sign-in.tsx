import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";
import { MobileOtpVerificationView, MobileSignInCard } from "@kaesava/capability-auth/mobile";
import { authClient } from "../../lib/auth";
import { setActiveSessionToken, setActiveTenantId, trpc } from "../../lib/trpc";

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState<{ email: string; password: string } | null>(null);

  const routeAfterAuth = async () => {
    const status = await utils.getTenantStatus.fetch();
    if (!status.hasTenant) return router.replace("/(auth)/complete-profile" as Href);
    if (status.tenantId) setActiveTenantId(status.tenantId);
    router.replace((status.setupCompleted ? "/(app)/today" : "/(setup)/business") as Href);
  };

  const handleSignIn = async (email: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email, password });
      if (res.error) {
        if (res.error.status === 403 || res.error.code === "EMAIL_NOT_VERIFIED") {
          await authClient.emailOtp.sendVerificationOtp({ email, type: "email-verification" });
          setUnverified({ email, password });
          return;
        }
        setError(res.error.message || t("auth.signInFailed"));
        return;
      }
      if (res.data?.token) setActiveSessionToken(res.data.token);
      await routeAfterAuth();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.errorTryAgain"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    const res = await authClient.signIn.social({ provider: "google", callbackURL: "tradiematters://auth-callback" });
    if (res.error) setError(res.error.message || t("common.errorTryAgain"));
  };

  const handleVerifyOtp = async (otp: string) => {
    if (!unverified) return;
    setLoading(true);
    setError(null);
    try {
      const res = await authClient.emailOtp.verifyEmail({ email: unverified.email, otp });
      if (res.error) return setError(res.error.message || t("auth.invalidOtp"));
      const signInRes = await authClient.signIn.email(unverified);
      if (signInRes.data?.token) setActiveSessionToken(signInRes.data.token);
      await routeAfterAuth();
    } finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top + 24, 48), paddingBottom: Math.max(insets.bottom + 24, 48) }]}
        keyboardShouldPersistTaps="handled"
      >
        {unverified ? (
          <MobileOtpVerificationView
            email={unverified.email}
            isSubmitting={loading}
            error={error}
            onVerify={handleVerifyOtp}
            onResend={async () => { await authClient.emailOtp.sendVerificationOtp({ email: unverified.email, type: "email-verification" }); }}
            onEditEmail={() => setUnverified(null)}
          />
        ) : (
          <MobileSignInCard
            appName={t("tradieMobile.appName")}
            isSubmitting={loading}
            error={error}
            onSignIn={handleSignIn}
            onGoogleSignIn={handleGoogleSignIn}
            onNavigateSignUp={() => router.push("/(auth)/sign-up" as Href)}
            onNavigateForgotPassword={() => router.push("/(auth)/forgot-password" as Href)}
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
