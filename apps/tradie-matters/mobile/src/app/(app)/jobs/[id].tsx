import React from "react";
import { StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileBadge, MobileSkeletonCard, ReadOnlyField, SettingsCard } from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { CheckInOutTimerBar } from "../../../components/jobs/CheckInOutTimerBar";
import { JobDetailActionsSection } from "../../../components/jobs/JobDetailActionsSection";
import { JobNotesCard } from "../../../components/jobs/JobNotesCard";
import { MobileJobProfitBar } from "../../../components/jobs/MobileJobProfitBar";
import { authClient } from "../../../lib/auth";
import { getActiveTenantId, trpc } from "../../../lib/trpc";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const tenantQuery = trpc.getTenant.useQuery(undefined, { enabled: !!session?.user });
  const detailQuery = trpc.jobs.getDetail.useQuery({ id: id ?? "" }, { enabled: Boolean(id) });
  const data = detailQuery.data;
  const tenantId = data?.job.tenantId ?? getActiveTenantId() ?? "";
  const userId = session?.user?.id ?? "";
  const activeVisit = data?.visits.find((v) => v.status !== "COMPLETED") ?? data?.visits[0];
  const openEntry = data?.timeEntries.find((entry) => !entry.checkOutAt);

  return (
    <TradieWorkspaceShell
      title={data ? `${data.job.jobNumber} · ${data.job.title}` : t("tradieMobile.jobDetailsTitle")}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
        {detailQuery.isLoading || !data ? (
          <MobileSkeletonCard />
        ) : (
          <>
            <SettingsCard title={t("tradieMobile.jobDetailsTitle")}>
              <ReadOnlyField label={t("tradieJobs.statusLabel")} value={data.job.status} />
              {data.customer ? <ReadOnlyField label={t("tradieCrm.customerNameLabel")} value={data.customer.name} /> : null}
              {data.site ? <ReadOnlyField label={t("tradieCrm.siteNameLabel")} value={`${data.site.name} · ${data.site.addressLine1}`} /> : null}
              {data.job.hasUnbilledExtras ? (
                <MobileBadge variant="warning">{t("tradieJobs.unbilledExtrasBadge")}</MobileBadge>
              ) : null}
            </SettingsCard>
            <MobileJobProfitBar jobId={data.job.id} userRole={tenantQuery.data?.currentUserRole} />
            <CheckInOutTimerBar
              tenantId={tenantId}
              userId={userId}
              visitId={activeVisit?.id}
              activeCheckInIso={openEntry ? new Date(openEntry.checkInAt).toISOString() : null}
            />
            <JobNotesCard tenantId={tenantId} userId={userId} jobId={data.job.id} initialNotes={data.job.internalNotes} />
            <JobDetailActionsSection
              tenantId={tenantId}
              userId={userId}
              jobId={data.job.id}
              jobNumber={data.job.jobNumber}
              visitId={activeVisit?.id}
              variationsCount={data.variations.length}
              materialsCount={data.materialUsages.length}
              photosCount={data.attachments.length}
            />
          </>
        )}
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
});