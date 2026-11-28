import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { ChipSelect, MobileBadge, MobileButton, SettingsCard, useAppTheme } from "@kaesava/ui/mobile";
import type { PlanKey, SubscriptionStatusDto } from "@kaesava/types";

export interface PlanUpgradeViewProps {
  status?: SubscriptionStatusDto | null;
  foundingAvailable?: boolean;
  displayPrices?: { monthly?: string; annual?: string; foundingAnnual?: string };
  isCheckingOut?: boolean;
  onSelectPlan: (planType: PlanKey) => void;
  onManagePortal?: () => void;
  onBack?: () => void;
}

const INCLUDED_FEATURES = [
  "subscription.featureHistoryPaid",
  "subscription.featureGoalsPaid",
  "subscription.featureCsvImportPaid",
  "subscription.featureFileNotesPaid",
  "subscription.featureNotifications",
] as const;

export function PlanUpgradeView({
  status,
  foundingAvailable = false,
  displayPrices,
  isCheckingOut = false,
  onSelectPlan,
  onManagePortal,
  onBack,
}: PlanUpgradeViewProps) {
  const { colors } = useAppTheme();
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const annualPrice = displayPrices?.annual ?? "79";
  const foundingPrice = displayPrices?.foundingAnnual ?? "49";
  const monthlyPrice = displayPrices?.monthly ?? "8.50";

  if (status?.isSubscribed && onManagePortal) {
    return (
      <SettingsCard title={t("subscription.alreadySubscribedTitle")}>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("subscription.alreadySubscribedSubtitle")}</Text>
        <View style={styles.actions}>
          <MobileButton title={t("subscription.manageSubscription")} onPress={onManagePortal} />
          {onBack && <MobileButton title={t("subscription.backToDashboard")} variant="secondary" onPress={onBack} />}
        </View>
      </SettingsCard>
    );
  }

  const targetPlan: PlanKey = billingCycle === "monthly" ? "monthly" : foundingAvailable ? "founding" : "annual";
  const ctaLabel =
    targetPlan === "founding"
      ? t("subscription.claimFoundingRate", { amount: foundingPrice })
      : targetPlan === "annual"
        ? t("subscription.subscribeAnnualCta", { amount: annualPrice })
        : t("subscription.subscribeMonthlyCta", { amount: monthlyPrice });

  return (
    <SettingsCard title={t("subscription.upgradePageTitle")}>
      <View style={styles.badgeRow}>
        <MobileBadge variant="primary">{t("subscription.annualDiscountBadge")}</MobileBadge>
      </View>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t("subscription.upgradePageSubtitle")}</Text>
      <ChipSelect
        value={billingCycle}
        onChange={(v: string) => setBillingCycle(v as "annual" | "monthly")}
        options={[
          { value: "annual", label: foundingAvailable ? t("subscription.annualTabFounding", { amount: foundingPrice }) : t("subscription.annualTabStandard", { amount: annualPrice }) },
          { value: "monthly", label: t("subscription.monthlyTab", { amount: monthlyPrice }) },
        ]}
      />
      <View style={styles.featureList}>
        {INCLUDED_FEATURES.map((key) => (
          <Text key={key} style={[styles.featureItem, { color: colors.textPrimary }]}>✓ {t(key)}</Text>
        ))}
      </View>
      <MobileButton title={ctaLabel} onPress={() => onSelectPlan(targetPlan)} loading={isCheckingOut} />
      <Text style={[styles.note, { color: colors.textMuted }]}>{t("subscription.autoRenewalNote")}</Text>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: "row", marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  featureList: { gap: 6, marginVertical: 12 },
  featureItem: { fontSize: 13 },
  note: { fontSize: 12, lineHeight: 16, marginTop: 10 },
  actions: { gap: 10, marginTop: 8 },
});
