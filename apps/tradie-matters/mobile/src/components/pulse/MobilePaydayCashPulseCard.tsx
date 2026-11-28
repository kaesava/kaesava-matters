import React from "react";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  MobileDetailLinkRow,
  MobileSkeletonCard,
  ReadOnlyField,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { formatMobileCurrency } from "../../lib/format";
import { trpc } from "../../lib/trpc";

interface MobilePaydayCashPulseCardProps {
  isOwner: boolean;
}

export function MobilePaydayCashPulseCard({ isOwner }: MobilePaydayCashPulseCardProps) {
  const router = useRouter();
  const pulseQuery = trpc.pulse.getWeeklyPaydayCashPulse.useQuery(undefined, { enabled: isOwner });

  if (!isOwner) return null;
  if (pulseQuery.isLoading) return <MobileSkeletonCard count={1} height={140} />;
  const data = pulseQuery.data;
  if (!data) return null;

  return (
    <SettingsCard title={t("tradiePulse.weeklyPaydayPulse")}>
      <ReadOnlyField label={t("tradiePulse.dueReceivables")} value={formatMobileCurrency(data.dueReceivables)} />
      <ReadOnlyField label={t("tradiePulse.overdueReceivables")} value={formatMobileCurrency(data.overdueReceivables)} />
      <ReadOnlyField label={t("tradiePulse.accruedCrewWages")} value={formatMobileCurrency(data.accruedWages)} />
      <ReadOnlyField label={t("tradiePulse.superContribution")} value={formatMobileCurrency(data.superContribution12Pct)} />
      <ReadOnlyField label={t("tradiePulse.netCashPulse")} value={formatMobileCurrency(data.netCashPulse)} />
      <MobileDetailLinkRow label={t("tradieMobile.openQuotesAction")} value="" onPress={() => router.push("/(app)/quotes" as Href)} />
      <MobileDetailLinkRow label={t("tradieMobile.openInvoicesAction")} value="" onPress={() => router.push("/(app)/invoices" as Href)} />
      <MobileDetailLinkRow label={t("tradieMobile.openTimesheetsAction")} value="" onPress={() => router.push("/(app)/timesheets" as Href)} />
      <MobileDetailLinkRow label={t("tradieMobile.openActivityAction")} value="" onPress={() => router.push("/(app)/activity" as Href)} />
    </SettingsCard>
  );
}
