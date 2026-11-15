import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@money-matters/i18n";
import { SUPPORTED_COUNTRIES } from "@money-matters/types";
import {
  DESIGN_TOKENS,
  MobileLogo,
  MobileButton,
  MobileInput,
  FormLabel,
  FormErrorBanner,
} from "@money-matters/ui/mobile";
import { SignUpTermsCheckbox } from "../../components/auth/SignUpTermsCheckbox";
import { useCompleteProfile } from "../../components/auth/useCompleteProfile";

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const form = useCompleteProfile();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
        <View style={styles.brandBlock}>
          <MobileLogo size={64} source={require("../../../assets/icon.png")} />
          <Text style={styles.title}>{t("auth.completeProfileTitle")}</Text>
          <Text style={styles.subtitle}>{t("auth.completeProfileSubtitle")}</Text>
        </View>

        <View style={styles.form}>
          <FormErrorBanner message={form.error} />
          <MobileInput
            label={t("auth.nameLabel")}
            required={true}
            autoFocus={true}
            value={form.name}
            onChangeText={(v) => {
              form.setName(v);
              if (form.fieldErrors.name) {
                form.setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }
            }}
            placeholder={t("auth.namePlaceholder")}
            error={form.fieldErrors.name}
          />

          <View style={styles.fieldGroup}>
            <FormLabel required={true}>{t("auth.countryLabel")}</FormLabel>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.countryRow}>
              {SUPPORTED_COUNTRIES.map((c) => {
                const isSelected = form.country === c.code;
                return (
                  <TouchableOpacity
                    key={c.code}
                    onPress={() => form.handleCountryChange(c.code)}
                    style={[styles.countryChip, isSelected && styles.countryChipSelected]}
                  >
                    <Text style={styles.countryFlag}>{c.flag}</Text>
                    <Text style={[styles.countryText, isSelected && styles.countryTextSelected]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <SignUpTermsCheckbox
            agreeTerms={form.agreeTerms}
            setAgreeTerms={form.setAgreeTerms}
            error={form.fieldErrors.agreeTerms}
            onClearError={() =>
              form.setFieldErrors((prev) => ({ ...prev, agreeTerms: undefined }))
            }
          />

          <MobileButton
            onPress={form.handleSubmit}
            loading={form.loading}
            disabled={!form.isFormValid || form.loading}
            variant="primary"
          >
            {t("auth.completeProfileCta")}
          </MobileButton>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: DESIGN_TOKENS.spacing.containerMargin,
    paddingVertical: 48,
  },
  brandBlock: { alignItems: "center", marginBottom: 28, gap: 6 },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: DESIGN_TOKENS.colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
    maxWidth: 280,
  },
  form: { gap: 14 },
  fieldGroup: { gap: 4 },
  countryRow: { flexDirection: "row", paddingVertical: 4 },
  countryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: DESIGN_TOKENS.radius.md,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: "#FFFFFF",
    marginRight: 8,
  },
  countryChipSelected: {
    borderColor: DESIGN_TOKENS.colors.accent,
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
  },
  countryFlag: { fontSize: 14 },
  countryText: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  countryTextSelected: { color: DESIGN_TOKENS.colors.accent },
});
