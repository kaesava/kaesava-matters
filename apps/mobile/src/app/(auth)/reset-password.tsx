import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@money-matters/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  FormLabel,
  FormFieldError,
  FormErrorBanner,  PLATFORM_STYLE,
} from "@money-matters/ui/mobile";
import { evaluatePasswordStrength } from "@money-matters/types";
import { authClient } from "../../lib/auth";
import { MobilePasswordStrength } from "../../components/auth/MobilePasswordStrength";

export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = params.token || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleReset = async () => {
    setError(null);

    if (!token) {
      setError(t("auth.invalidToken"));
      return;
    }

    if (evaluatePasswordStrength(password).score < 4) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsMustMatch"));
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPassword({
        newPassword: password,
        token,
      });

      if (res.error) {
        setError(res.error.message || t("auth.resetPasswordGenericError"));
        return;
      }

      setIsSuccess(true);
      setTimeout(() => {
        router.replace("/(auth)/sign-in");
      }, 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resetPasswordGenericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    token.length > 0 &&
    evaluatePasswordStrength(password).score === 4 &&
    password === confirmPassword;

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
        <TouchableOpacity
          onPress={() => router.replace("/(auth)/sign-in")}
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← {t("common.back")}</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.title}>{t("auth.resetPassword")}</Text>
          <Text style={styles.subtitle}>{t("auth.resetPasswordSubtitle")}</Text>

          {error && <FormErrorBanner message={error} />}

          {!token && (
            <View style={styles.tokenWarning}>
              <Text style={styles.tokenWarningText}>{t("auth.invalidToken")}</Text>
            </View>
          )}

          {isSuccess ? (
            <View style={styles.successBox}>
              <Text style={styles.successTitle}>{t("auth.passwordResetSuccessTitle")}</Text>
              <Text style={styles.successDesc}>{t("auth.passwordResetSuccessDesc")}</Text>
            </View>
          ) : (
            <View style={styles.form}>
              <View style={styles.field}>
                <FormLabel required>{t("auth.newPasswordLabel")}</FormLabel>
                <MobileInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={Boolean(token) && !isSubmitting}
                />
                {password.length > 0 && <MobilePasswordStrength password={password} />}
              </View>

              <View style={styles.field}>
                <FormLabel required>{t("auth.confirmPasswordLabel")}</FormLabel>
                <MobileInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder={t("auth.confirmPasswordPlaceholder")}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={Boolean(token) && !isSubmitting}
                />
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <FormFieldError error={t("auth.passwordsMustMatch")} />
                )}
              </View>

              <MobileButton
                onPress={handleReset}
                disabled={!isFormValid || isSubmitting}
                loading={isSubmitting}
                style={styles.submitBtn}
              >
                {t("auth.resetPasswordButton")}
              </MobileButton>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
  container: {
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    justifyContent: "center",
  },
  backBtn: {
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    fontWeight: "500",
  },
  card: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: DESIGN_TOKENS.radius.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: DESIGN_TOKENS.colors.textMuted,
    marginBottom: 20,
  },
  tokenWarning: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    padding: 12,
    borderRadius: DESIGN_TOKENS.radius.default,
    marginBottom: 16,
  },
  tokenWarningText: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.warningDark,
  },
  successBox: {
    paddingVertical: 16,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textPrimary,
    marginBottom: 8,
  },
  successDesc: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  field: {
    gap: 6,
  },
  submitBtn: {
    marginTop: 8,
  },
});
