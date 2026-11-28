import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  FormErrorBanner,
  FormLabel,
  MobileButton,
  MobileInput,
  PLATFORM_STYLE,
  SetupProgressBar,
  SwitchRow,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export default function SetupBusinessScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const [businessName, setBusinessName] = useState("");
  const [tradeType, setTradeType] = useState("GENERAL");
  const [abn, setAbn] = useState("");
  const [gstRegistered, setGstRegistered] = useState(true);
  const [taxRate, setTaxRate] = useState("10");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    if (p.businessName) setBusinessName(p.businessName);
    if (p.tradeType) setTradeType(p.tradeType);
    if (p.abn) setAbn(p.abn);
    setGstRegistered(p.gstRegistered ?? true);
    if (p.defaultTaxRatePercent) setTaxRate(p.defaultTaxRatePercent);
  }, [profileQuery.data]);

  const updateMut = trpc.updateBusinessProfile.useMutation({
    onSuccess: () => router.push("/(setup)/rates" as Href),
    onError: (err) => setError(err.message || t("common.errorTryAgain")),
  });

  const handleNext = () => {
    setError(null);
    updateMut.mutate({
      businessName: businessName.trim() || undefined,
      tradeType: tradeType.trim() || "GENERAL",
      abn: abn.trim() || null,
      gstRegistered,
      defaultTaxRatePercent: taxRate.trim() || "10",
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <SetupProgressBar currentStep={1} totalSteps={3} stepTitle={t("tradieMobile.setupStepBusiness")} />
        <View style={styles.card}>
          <Text style={styles.title}>{t("tradieSetup.title")}</Text>
          <Text style={styles.subtitle}>{t("tradieSetup.subtitle")}</Text>
          <FormErrorBanner message={error} />
          <FormLabel required>{t("tradieSetup.businessNameLabel")}</FormLabel>
          <MobileInput value={businessName} onChangeText={setBusinessName} placeholder={t("tradieMobile.businessNamePlaceholder")} />
          <FormLabel required>{t("tradieSetup.tradeTypeLabel")}</FormLabel>
          <MobileInput value={tradeType} onChangeText={setTradeType} placeholder={t("tradieMobile.tradeTypePlaceholder")} />
          <FormLabel>{t("tradieSetup.abnLabel")}</FormLabel>
          <MobileInput value={abn} onChangeText={setAbn} placeholder={t("tradieMobile.abnPlaceholder")} keyboardType="numeric" />
          <SwitchRow label={t("tradieSetup.gstRegisteredLabel")} value={gstRegistered} onValueChange={setGstRegistered} />
          <FormLabel>{t("tradieSetup.defaultTaxRateLabel")}</FormLabel>
          <MobileInput value={taxRate} onChangeText={setTaxRate} placeholder={t("tradieMobile.taxRatePlaceholder")} keyboardType="decimal-pad" />
          <MobileButton title={t("tradieMobile.continueAction")} onPress={handleNext} loading={updateMut.isPending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 20, gap: 12 },
  title: { fontSize: 20, fontWeight: "800", color: DESIGN_TOKENS.colors.textPrimary },
  subtitle: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
