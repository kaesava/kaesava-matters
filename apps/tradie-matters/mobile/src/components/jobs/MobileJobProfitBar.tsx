import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, ReadOnlyField, SettingsCard } from "@kaesava/ui/mobile";
import { formatMobileCurrency } from "../../lib/format";
import { trpc } from "../../lib/trpc";

interface MobileJobProfitBarProps {
  jobId: string;
  userRole?: string | null;
}

export function MobileJobProfitBar({ jobId, userRole }: MobileJobProfitBarProps) {
  const isTradie = userRole === "TRADIE";
  const marginQuery = trpc.pulse.getJobMargin.useQuery(
    { jobId },
    { enabled: Boolean(jobId) && !isTradie }
  );

  if (isTradie || marginQuery.isLoading || !marginQuery.data || marginQuery.data.redacted) {
    return null;
  }

  const { revenueExTax, labourCost, materialCost, grossProfit, marginPct } = marginQuery.data;
  const totalCost = (labourCost ?? 0) + (materialCost ?? 0);
  const pct = Math.max(0, Math.min(100, marginPct ?? 0));

  return (
    <SettingsCard title={t("tradiePulse.jobMargin")}>
      <ReadOnlyField label={t("tradieMobile.revenueLabel")} value={formatMobileCurrency(revenueExTax ?? 0)} />
      <ReadOnlyField label={t("tradieMobile.costsLabel")} value={formatMobileCurrency(totalCost)} />
      <ReadOnlyField label={t("tradiePulse.grossProfit")} value={formatMobileCurrency(grossProfit ?? 0)} />
      <View style={styles.barWrap}>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pctText}>{`${t("tradieMobile.marginLabel")}: ${(marginPct ?? 0).toFixed(1)}%`}</Text>
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  barWrap: { gap: 4, marginTop: 4 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
    overflow: "hidden",
  },
  barFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.success,
  },
  pctText: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.textMuted },
});
