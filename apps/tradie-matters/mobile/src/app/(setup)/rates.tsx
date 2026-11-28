import React, { useEffect, useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import {
  AmountInput,
  DESIGN_TOKENS,
  FormErrorBanner,
  FormLabel,
  MobileButton,
  MobileInput,
  PLATFORM_STYLE,
  SetupProgressBar,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export default function SetupRatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const [hourlyRate, setHourlyRate] = useState("120.00");
  const [quotePrefix, setQuotePrefix] = useState("QTE-");
  const [nextQuote, setNextQuote] = useState("1");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [nextInvoice, setNextInvoice] = useState("1");
  const [paymentTerms, setPaymentTerms] = useState("14");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const p = profileQuery.data;
    if (!p) return;
    if (p.defaultHourlyChargeRate) setHourlyRate(p.defaultHourlyChargeRate);
    if (p.quotePrefix) setQuotePrefix(p.quotePrefix);
    if (p.nextQuoteNumber) setNextQuote(String(p.nextQuoteNumber));
    if (p.invoicePrefix) setInvoicePrefix(p.invoicePrefix);
    if (p.nextInvoiceNumber) setNextInvoice(String(p.nextInvoiceNumber));
    if (p.defaultPaymentTermsDays !== undefined) setPaymentTerms(String(p.defaultPaymentTermsDays));
  }, [profileQuery.data]);

  const updateMut = trpc.updateBusinessProfile.useMutation({
    onSuccess: () => router.push("/(setup)/payments" as Href),
    onError: (err) => setError(err.message || t("common.errorTryAgain")),
  });

  const handleNext = () => {
    setError(null);
    updateMut.mutate({
      defaultHourlyChargeRate: hourlyRate.trim() || null,
      quotePrefix: quotePrefix.trim() || "QTE-",
      nextQuoteNumber: Math.max(1, parseInt(nextQuote, 10) || 1),
      invoicePrefix: invoicePrefix.trim() || "INV-",
      nextInvoiceNumber: Math.max(1, parseInt(nextInvoice, 10) || 1),
      defaultPaymentTermsDays: Math.max(0, parseInt(paymentTerms, 10) || 14),
    });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <SetupProgressBar currentStep={2} totalSteps={3} stepTitle={t("tradieMobile.setupStepRates")} />
        <View style={styles.card}>
          <FormErrorBanner message={error} />
          <FormLabel>{t("tradieSetup.hourlyChargeRateLabel")}</FormLabel>
          <AmountInput value={hourlyRate} onChangeText={setHourlyRate} placeholder={t("tradieMobile.hourlyRatePlaceholder")} />
          <FormLabel>{t("tradieSetup.quotePrefixLabel")}</FormLabel>
          <MobileInput value={quotePrefix} onChangeText={setQuotePrefix} placeholder={t("tradieMobile.quotePrefixPlaceholder")} />
          <FormLabel>{t("tradieSetup.nextQuoteNumberLabel")}</FormLabel>
          <MobileInput value={nextQuote} onChangeText={setNextQuote} keyboardType="numeric" />
          <FormLabel>{t("tradieSetup.invoicePrefixLabel")}</FormLabel>
          <MobileInput value={invoicePrefix} onChangeText={setInvoicePrefix} placeholder={t("tradieMobile.invoicePrefixPlaceholder")} />
          <FormLabel>{t("tradieSetup.nextInvoiceNumberLabel")}</FormLabel>
          <MobileInput value={nextInvoice} onChangeText={setNextInvoice} keyboardType="numeric" />
          <FormLabel>{t("tradieSetup.paymentTermsLabel")}</FormLabel>
          <MobileInput value={paymentTerms} onChangeText={setPaymentTerms} keyboardType="numeric" />
          <MobileButton title={t("tradieMobile.continueAction")} onPress={handleNext} loading={updateMut.isPending} />
          <MobileButton title={t("common.back")} variant="secondary" onPress={() => router.back()} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, paddingHorizontal: 16, gap: 12 },
  card: { backgroundColor: "#ffffff", borderRadius: 16, borderWidth: 1, borderColor: "#e2e8f0", padding: 20, gap: 12 },
});
