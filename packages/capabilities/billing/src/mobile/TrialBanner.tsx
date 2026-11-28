import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";
import type { SubscriptionStatusDto } from "@kaesava/types";

export interface TrialBannerProps {
  status?: SubscriptionStatusDto | null;
  isLoading?: boolean;
  onUpgrade: () => void;
}

export function TrialBanner({ status, isLoading, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !status || status.isSubscribed || dismissed) return null;

  const days = status.daysRemainingInTrial ?? 60;
  const showForTrial = status.isTrialActive && days <= 7;
  const showForPastDue = status.isPastDue;
  if (!showForTrial && !showForPastDue) return null;

  const message = status.isTrialActive
    ? t("subscription.bannerUrgent", { days: String(days) })
    : t("subscription.bannerPastDue");
  const bgColor = status.isTrialActive
    ? days <= 3
      ? DESIGN_TOKENS.colors.burnRed
      : DESIGN_TOKENS.colors.warning
    : DESIGN_TOKENS.colors.warning;

  return (
    <View style={[styles.banner, { backgroundColor: bgColor }]}>
      <View style={styles.messageWrap}>
        <Text style={styles.message} numberOfLines={2}>
          ⚡ {message}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onUpgrade} style={styles.ctaBtn} accessibilityRole="button">
          <Text style={styles.ctaText}>{t("subscription.upgradeCta")}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={styles.dismissBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityLabel={t("common.close")}
          accessibilityRole="button"
        >
          <Text style={styles.dismissText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 14, gap: 10 },
  messageWrap: { flex: 1 },
  message: { color: DESIGN_TOKENS.colors.onPrimary, fontSize: 12, fontWeight: "700" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  ctaBtn: { backgroundColor: DESIGN_TOKENS.colors.onPrimary, minHeight: PLATFORM_STYLE.minTouch, justifyContent: "center", paddingHorizontal: 12, borderRadius: DESIGN_TOKENS.radius.sm },
  ctaText: { fontSize: 12, fontWeight: "800", color: DESIGN_TOKENS.colors.primary },
  dismissBtn: { minWidth: 24, minHeight: 24, alignItems: "center", justifyContent: "center" },
  dismissText: { color: DESIGN_TOKENS.colors.onPrimary, fontSize: 14, fontWeight: "700", opacity: 0.85 },
});
