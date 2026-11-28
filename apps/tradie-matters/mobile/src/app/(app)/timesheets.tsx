import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileBadge,
  MobileButton,
  MobileCardRow,
  MobileSkeletonCard,
  ReadOnlyField,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { authClient } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { trpc } from "../../lib/trpc";

export default function TimesheetsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();

  const listQuery = trpc.timesheets.list.useQuery(undefined, { enabled: !!session?.user });
  const approveMut = trpc.timesheets.approve.useMutation({
    onSuccess: () => {
      void utils.timesheets.invalidate();
      void utils.pulse.invalidate();
      toast.success(t("tradieMobile.timesheetApprovedToast"));
    },
  });

  const rows = listQuery.data ?? [];
  const totalMinutes = rows.reduce((sum, r) => sum + r.entry.durationMinutes, 0);

  return (
    <TradieWorkspaceShell title={t("tradiePulse.timesheets")} showBack onBackPress={() => router.back()}>
      <View style={styles.container}>
        <SettingsCard title={t("tradiePulse.timesheets")}>
          <ReadOnlyField label={t("tradieMobile.totalHoursLabel")} value={`${(totalMinutes / 60).toFixed(1)}h`} />
        </SettingsCard>
        {listQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : rows.length === 0 ? (
          <SettingsCard title={t("tradiePulse.timesheets")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyTimesheets")}</Text>
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradiePulse.timesheets")}>
            {rows.map((row) => (
              <MobileCardRow key={row.entry.id}>
                <View style={styles.rowTop}>
                  <Text style={styles.title}>{row.workerName || row.workerEmail || t("common.user")}</Text>
                  <MobileBadge variant={row.entry.isBillable ? "success" : "warning"}>
                    {row.entry.isBillable ? t("tradieMobile.billableLabel") : t("tradieMobile.nonBillableLabel")}
                  </MobileBadge>
                </View>
                <Text style={styles.sub}>
                  {`${row.jobNumber ?? ""} · ${(row.entry.durationMinutes / 60).toFixed(1)}h · ${formatDate(row.entry.startedAt)}`}
                </Text>
                <MobileButton
                  title={row.entry.isBillable ? t("tradieMobile.nonBillableLabel") : t("tradiePulse.approveTimesheet")}
                  variant="secondary"
                  loading={approveMut.isPending}
                  onPress={() => approveMut.mutate({ entryId: row.entry.id, isBillable: !row.entry.isBillable })}
                />
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  sub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
