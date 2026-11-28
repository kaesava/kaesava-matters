import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  exportCsvFile,
  MobileActivityHistoryList,
  MobileButton,
  useMobileToast,
  type MobileActivityItem,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { authClient } from "../../lib/auth";
import { formatDate, formatMobileCurrency } from "../../lib/format";
import { trpc } from "../../lib/trpc";

export default function ActivityScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const { data: session } = authClient.useSession();

  const activityQuery = trpc.activity.list.useQuery(undefined, { enabled: !!session?.user });
  const rows = activityQuery.data ?? [];

  const items: MobileActivityItem[] = useMemo(
    () =>
      rows.map((row) => ({
        id: row.id,
        actorName: row.kind,
        action: row.title,
        target: row.subtitle,
        summary: formatMobileCurrency(row.amount),
        timestamp: row.occurredAt,
      })),
    [rows]
  );

  const handleExportCsv = async () => {
    const header = "Kind,Title,Subtitle,Amount,OccurredAt";
    const body = rows.map((r) => [r.kind, r.title, r.subtitle ?? "", r.amount, r.occurredAt].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const ok = await exportCsvFile({
      filename: "tradie-financial-activity.csv",
      csvContent: [header, ...body].join("\n"),
      dialogTitle: t("tradiePulse.financialActivity"),
    });
    if (ok) toast.success(t("tradieMobile.csvExportedToast"));
  };

  return (
    <TradieWorkspaceShell title={t("tradiePulse.financialActivity")} showBack onBackPress={() => router.back()}>
      <View style={styles.container}>
        <MobileButton
          title={t("tradieMobile.exportCsvAction")}
          variant="secondary"
          disabled={rows.length === 0}
          onPress={() => void handleExportCsv()}
        />
        <MobileActivityHistoryList
          items={items}
          isLoading={activityQuery.isLoading}
          formatTimestamp={(iso) => formatDate(iso)}
        />
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
});
