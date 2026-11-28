import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { FormErrorBanner, FormLabel, MobileButton, MobileInput, useAppTheme } from "@kaesava/ui/mobile";

export interface MobileCompleteProfileViewProps {
  defaultName?: string;
  defaultHouseholdName?: string;
  householdLabel?: string;
  householdPlaceholder?: string;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: (data: { name: string; householdName: string }) => Promise<void> | void;
}

export function MobileCompleteProfileView({
  defaultName = "",
  defaultHouseholdName = "",
  householdLabel,
  householdPlaceholder,
  isSubmitting = false,
  error = null,
  onSubmit,
}: MobileCompleteProfileViewProps) {
  const { colors } = useAppTheme();
  const [name, setName] = useState(defaultName);
  const [householdName, setHouseholdName] = useState(defaultHouseholdName);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLocalError(null);
    if (!name.trim()) return setLocalError(t("auth.fillAllFields"));
    if (!householdName.trim()) return setLocalError(t("auth.householdNameRequired"));
    await onSubmit({ name: name.trim(), householdName: householdName.trim() });
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>{t("auth.completeProfileTitle")}</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("auth.completeProfileSubtitle")}</Text>
      <FormErrorBanner message={localError || error} />
      <View style={styles.field}>
        <FormLabel required>{t("auth.nameLabel")}</FormLabel>
        <MobileInput value={name} onChangeText={setName} placeholder={t("auth.namePlaceholder")} />
      </View>
      <View style={styles.field}>
        <FormLabel required>{householdLabel || t("auth.householdNameLabel")}</FormLabel>
        <MobileInput
          value={householdName}
          onChangeText={setHouseholdName}
          placeholder={householdPlaceholder || t("auth.householdNamePlaceholder")}
        />
      </View>
      <MobileButton title={t("auth.completeProfileCta")} onPress={handleSubmit} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: "800" },
  subtitle: { fontSize: 13, lineHeight: 18 },
  field: { gap: 4 },
});
