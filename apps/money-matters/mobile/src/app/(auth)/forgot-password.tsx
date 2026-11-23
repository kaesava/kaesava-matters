import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";
import { ForgotPasswordEmailStep } from "../../components/auth/ForgotPasswordEmailStep";
import { ForgotPasswordOtpStep } from "../../components/auth/ForgotPasswordOtpStep";
import { ForgotPasswordSuccessStep } from "../../components/auth/ForgotPasswordSuccessStep";
import { useForgotPassword } from "../../components/auth/useForgotPassword";

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    step,
    setStep,
    email,
    setEmail,
    otp,
    setOtp,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isRequestingCode,
    isResetting,
    isResending,
    resendSuccess,
    resendCooldown,
    resendLimitReached,
    error,
    setError,
    fieldErrors,
    setFieldErrors,
    handleRequestCode,
    handleResendCode,
    handleResetPassword,
    isResetValid,
  } = useForgotPassword();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={PLATFORM_STYLE.keyboardBehavior}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top + 24, 48),
            paddingBottom: Math.max(insets.bottom + 24, 48),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === "reset") {
                setStep("email");
                setOtp("");
              } else {
                router.replace("/(auth)/sign-in");
              }
            }}
            style={styles.backBtn}
          >
            <Text style={styles.backText}>← {t("common.back")}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>
            {step === "success"
              ? t("auth.passwordResetSuccessTitle")
              : step === "reset"
              ? t("auth.setNewPasswordTitle")
              : t("auth.forgotPasswordTitle")}
          </Text>
          <Text style={styles.subtitle}>
            {step === "success"
              ? t("auth.passwordResetSuccessDesc")
              : step === "reset"
              ? t("auth.setNewPasswordSubtitle")
              : t("auth.forgotPasswordSubtitle")}
          </Text>
        </View>

        {step === "email" && (
          <ForgotPasswordEmailStep
            email={email}
            setEmail={setEmail}
            onSubmit={handleRequestCode}
            loading={isRequestingCode}
            error={error}
          />
        )}

        {step === "reset" && (
          <ForgotPasswordOtpStep
            email={email}
            onEditEmail={() => {
              setStep("email");
              setOtp("");
              setError(null);
            }}
            otp={otp}
            setOtp={setOtp}
            password={password}
            setPassword={setPassword}
            confirmPassword={confirmPassword}
            setConfirmPassword={setConfirmPassword}
            resendSuccess={resendSuccess}
            isResending={isResending}
            resendCooldown={resendCooldown}
            resendLimitReached={resendLimitReached}
            onResend={handleResendCode}
            error={error}
            fieldErrors={fieldErrors}
            setFieldErrors={setFieldErrors}
            onSubmit={handleResetPassword}
            isResetting={isResetting}
            isResetValid={isResetValid}
          />
        )}

        {step === "success" && <ForgotPasswordSuccessStep />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: {
    flexGrow: 1,
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingVertical: 48,
  },
  header: { marginBottom: 28 },
  backBtn: { marginBottom: 16 },
  backText: { fontSize: 14, color: DESIGN_TOKENS.colors.accent, fontWeight: "600" },
  title: { fontSize: 26, fontWeight: "700", color: DESIGN_TOKENS.colors.primary, marginBottom: 6 },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted, lineHeight: 18 },
});
