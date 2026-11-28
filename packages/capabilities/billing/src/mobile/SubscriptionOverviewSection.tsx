import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileBadge, MobileButton, SettingsCard, fmtDate, useAppTheme } from "@kaesava/ui/mobile";
import type { SubscriptionStatusDto } from "@kaesava/types";

export interface SubscriptionOverviewSectionProps {
  status?: SubscriptionStatusDto | null;
  isLoading?: boolean;
  isSyncing?: boolean;
  isOpeningPortal?: boolean;
  supportEmail?: string;
  onUpgrade: () => void;
  onManagePortal: () => void;
  onSync?: () => void;
}

function resolvePlanLabel(status: SubscriptionStatusDto): string {
  if (status.isSubscribed) {
    if (status.planType === "founding") return t("subscription.tierFounding");
    if (status.planType === "monthly") return t("subscription.tierMonthly");
    return t("subscription.tierAnnual");
  }
  if (status.isPastDue) return t("subscription.tierPastDue");
  if (status.isTrialActive) return t("subscription.tierTrial", { days: String(status.daysRemainingInTrial ?? 0) });
  return t("subscription.tierExpired");
}

export function SubscriptionOverviewSection({
  status,
  isLoading,
  isSyncing,
  isOpeningPortal,
  supportEmail,
  onUpgrade,
  onManagePortal,
  onSync,
}: SubscriptionOverviewSectionProps) {
  const { colors } = useAppTheme();
  if (isLoading || !status) return null;

  const badgeText = status.isSubscribed
    ? status.cancelAtPeriodEnd
      ? t("subscription.cancelingBadge")
      : t("subscription.activeBadge")
    : status.isTrialActive
      ? t("subscription.trialBadge")
      : t("subscription.upgradeBadge");
  const renewDate = status.nextBillingAt || status.subscriptionEndsAt;

  return (
    <SettingsCard title={t("subscription.currentSubscription")}>
      <View style={styles.headerRow}>
        <Text style={[styles.planLabel, { color: colors.textPrimary }]}>{resolvePlanLabel(status)}</Text>
        <MobileBadge variant={status.isSubscribed && !status.cancelAtPeriodEnd ? "success" : "warning"}>
          {badgeText}
        </MobileBadge>
      </View>
      {renewDate && status.isSubscribed && (
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {status.cancelAtPeriodEnd
            ? t("subscription.cancelingNotice", { date: fmtDate(renewDate) })
            : t("subscription.renewsOn", { date: fmtDate(renewDate) })}
        </Text>
      )}
      <Text style={[styles.meta, { color: colors.textMuted }]}>{t("subscription.billingDesc")}</Text>
      <View style={styles.actions}>
        {status.isSubscribed ? (
          <MobileButton
            title={status.cancelAtPeriodEnd ? t("subscription.resumeSubscription") : t("subscription.manageSubscription")}
            onPress={onManagePortal}
            loading={isOpeningPortal}
          />
        ) : (
          <MobileButton title={t("subscription.upgradeCta")} onPress={onUpgrade} />
        )}
        {onSync && <MobileButton title={t("subscription.refreshTooltip")} variant="secondary" onPress={onSync} loading={isSyncing} />}
      </View>
      {supportEmail && <Text style={[styles.meta, { color: colors.textMuted }]}>{t("subscription.supportHelpText", { email: supportEmail })}</Text>}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 6 },
  planLabel: { fontSize: 15, fontWeight: "700", flex: 1 },
  meta: { fontSize: 13, lineHeight: 18, marginBottom: 8 },
  actions: { gap: 10, marginTop: 4 },
});
