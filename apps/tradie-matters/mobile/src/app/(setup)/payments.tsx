import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
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
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export default function SetupPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const [accountName, setAccountName] = useState("");
  const [bsb, setBsb] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    if (p.bankAccountName) setAccountName(p.bankAccountName);
    if (p.bankBsb) setBsb(p.bankBsb);
    if (p.bankAccountNumber) setAccountNumber(p.bankAccountNumber);
  }, [profileQuery.data]);

  const completeMut = trpc.completeBusinessSetup.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.getTenantStatus.invalidate(), utils.getBusinessProfile.invalidate()]);
      toast.success(t("toasts.saved"));
      router.replace("/(app)/today" as Href);
    },
    onError: (err) => setError(err.message || t("common.errorTryAgain")),
  });

  const handleComplete = () => {
    setError(null);
    completeMut.mutate({
      tradeType: profileQuery.data?.tradeType || "GENERAL",
      bankAccountName: accountName.trim() || null,
      bankBsb: bsb.trim() || null,
      bankAccountNumber: accountNumber.trim() || null,
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <SetupProgressBar currentStep={3} totalSteps={3} stepTitle={t("tradieMobile.setupStepPayments")} />
        <View style={styles.card}>
          <FormErrorBanner message={error} />
          <FormLabel>{t("tradieSetup.bankAccountNameLabel")}</FormLabel>
          <MobileInput value={accountName} onChangeText={setAccountName} placeholder={t("tradieMobile.bankAccountNamePlaceholder")} />
          <FormLabel>{t("tradieSetup.bankBsbLabel")}</FormLabel>
          <MobileInput value={bsb} onChangeText={setBsb} placeholder={t("tradieMobile.bankBsbPlaceholder")} />
          <FormLabel>{t("tradieSetup.bankAccountNumberLabel")}</FormLabel>
          <MobileInput value={accountNumber} onChangeText={setAccountNumber} placeholder={t("tradieMobile.bankAccountNumberPlaceholder")} />
          <MobileButton title={t("tradieSetup.completeSetupAction")} onPress={handleComplete} loading={completeMut.isPending} />
          <MobileButton title={t("tradieMobile.skipAction")} variant="secondary" onPress={handleComplete} disabled={completeMut.isPending} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: DESIGN_TOKENS.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: DESIGN_TOKENS.colors.slate[200], padding: 20, gap: 12 },
});
