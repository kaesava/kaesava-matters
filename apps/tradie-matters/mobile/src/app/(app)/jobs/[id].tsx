import React, { useState } from "react";
import { Image, Linking, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileBadge,
  MobileButton,
  MobileDetailLinkRow,
  MobileSkeletonCard,
  ReadOnlyField,
  SegmentedTabs,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { CheckInOutTimerBar } from "../../../components/jobs/CheckInOutTimerBar";
import { JobDetailActionsSection } from "../../../components/jobs/JobDetailActionsSection";
import { JobNotesCard } from "../../../components/jobs/JobNotesCard";
import { MobileJobProfitBar } from "../../../components/jobs/MobileJobProfitBar";
import { authClient } from "../../../lib/auth";
import { formatDate, formatMobileCurrency } from "../../../lib/format";
import { getActiveTenantId, trpc } from "../../../lib/trpc";

type JobTab = "overview" | "visits" | "variations" | "materials" | "photos";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [activeTab, setActiveTab] = useState<JobTab>("overview");
  const [photoFilter, setPhotoFilter] = useState<"ALL" | "INTERNAL" | "CUSTOMER" | "RECEIPT">("ALL");

  const governanceQuery = trpc.getGovernanceInfo.useQuery(undefined, { enabled: !!session?.user });
  const detailQuery = trpc.jobs.getDetail.useQuery({ id: id ?? "" }, { enabled: Boolean(id) });
  const updateJobMut = trpc.jobs.update.useMutation({
    onSuccess: () => {
      void utils.jobs.invalidate();
      toast.success(t("common.saved"));
    },
    onError: (err) => toast.error(err.message),
  });
  const approveVarMut = trpc.field.approveVariation.useMutation({
    onSuccess: () => {
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.variationApprovedToast"));
    },
    onError: (err) => toast.error(err.message),
  });

  const data = detailQuery.data;
  const tenantId = data?.job.tenantId ?? getActiveTenantId() ?? "";
  const userId = session?.user?.id ?? "";
  const activeVisit =
    data?.visits.find((v) => v.status === "CHECKED_IN") ??
    data?.visits.find((v) => v.status !== "COMPLETED") ??
    data?.visits[0];
  const openEntry = data?.timeEntries.find((entry) => !entry.endedAt);

  const site = data?.site as
    | {
        name?: string;
        addressLine1?: string;
        accessNotes?: string | null;
        lockboxCode?: string | null;
        hazardNotes?: string | null;
      }
    | null
    | undefined;

  const filteredPhotos = (data?.attachments ?? []).filter((att) => {
    if (photoFilter === "ALL") return true;
    if (photoFilter === "RECEIPT") return att.photoCategory === "RECEIPT";
    return att.visibility === photoFilter;
  });

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
            <SegmentedTabs<JobTab>
              tabs={[
                { key: "overview", label: t("tradieMobile.overviewTab") },
                { key: "visits", label: `${t("tradieJobs.visitsTab")} (${data.visits.length})` },
                { key: "variations", label: `${t("tradieJobs.variationsTab")} (${data.variations.length})` },
                { key: "materials", label: `${t("tradieJobs.materialsTab")} (${data.materialUsages.length})` },
                { key: "photos", label: `${t("tradieJobs.photosTab")} (${data.attachments.length})` },
              ]}
              activeKey={activeTab}
              onChange={setActiveTab}
            />

            {activeTab === "overview" ? (
              <>
                <SettingsCard title={t("tradieMobile.jobDetailsTitle")}>
                  <ChipSelect
                    label={t("tradieJobs.statusLabel")}
                    value={data.job.status}
                    options={[
                      { label: "New", value: "NEW" },
                      { label: "Scheduled", value: "SCHEDULED" },
                      { label: "In Progress", value: "IN_PROGRESS" },
                      { label: "Completed", value: "COMPLETED" },
                    ]}
                    onChange={(status) =>
                      updateJobMut.mutate({
                        id: data.job.id,
                        status: status as "LEAD" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED",
                      })
                    }
                  />
                  {data.customer ? (
                    <ReadOnlyField label={t("tradieCrm.customerNameLabel")} value={data.customer.name} />
                  ) : null}
                  {site ? (
                    <>
                      <ReadOnlyField
                        label={t("tradieCrm.siteNameLabel")}
                        value={`${site.name ?? ""} · ${site.addressLine1 ?? ""}`}
                      />
                      {site.addressLine1 ? (
                        <MobileDetailLinkRow
                          label={t("tradieMobile.openInMapsAction")}
                          value={site.addressLine1}
                          onPress={() =>
                            void Linking.openURL(
                              `https://maps.google.com/?q=${encodeURIComponent(site.addressLine1 ?? "")}`
                            )
                          }
                        />
                      ) : null}
                      {site.accessNotes ? (
                        <ReadOnlyField label={t("tradieCrm.accessNotesLabel")} value={site.accessNotes} />
                      ) : null}
                      {site.lockboxCode ? (
                        <ReadOnlyField label={t("tradieCrm.lockboxCodeLabel")} value={site.lockboxCode} />
                      ) : null}
                      {site.hazardNotes ? (
                        <ReadOnlyField label={t("tradieCrm.hazardNotesLabel")} value={site.hazardNotes} />
                      ) : null}
                    </>
                  ) : null}
                  {data.job.hasUnbilledExtras ? (
                    <MobileBadge variant="warning">{t("tradieJobs.unbilledExtrasBadge")}</MobileBadge>
                  ) : null}
                </SettingsCard>
                <MobileJobProfitBar jobId={data.job.id} userRole={governanceQuery.data?.userRole} />
                <CheckInOutTimerBar
                  tenantId={tenantId}
                  userId={userId}
                  visitId={activeVisit?.id}
                  activeCheckInIso={openEntry ? new Date(openEntry.startedAt).toISOString() : null}
                />
                <JobNotesCard
                  tenantId={tenantId}
                  userId={userId}
                  jobId={data.job.id}
                  initialNotes={data.job.internalNotes}
                />
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
            ) : null}

            {activeTab === "visits" ? (
              <SettingsCard title={t("tradieJobs.visitsTab")}>
                {data.visits.map((v) => (
                  <ReadOnlyField
                    key={v.id}
                    label={`${v.title || t("tradieJobs.scheduleVisitAction")} · ${v.status}`}
                    value={formatDate(v.scheduledStart)}
                  />
                ))}
              </SettingsCard>
            ) : null}

            {activeTab === "variations" ? (
              <SettingsCard title={t("tradieJobs.variationsTab")}>
                {data.variations.map((varItem) => (
                  <View key={varItem.id} style={styles.rowCard}>
                    <ReadOnlyField
                      label={`${varItem.title} · ${varItem.status}`}
                      value={formatMobileCurrency(varItem.totalIncTax ?? 0)}
                    />
                    {varItem.status !== "APPROVED" ? (
                      <MobileButton
                        title={t("tradieMobile.approveVariationAction")}
                        size="sm"
                        loading={approveVarMut.isPending}
                        onPress={() =>
                          approveVarMut.mutate({
                            variationId: varItem.id,
                            approvedByName: data.customer?.name || t("tradieMobile.customerLabel"),
                          })
                        }
                      />
                    ) : null}
                  </View>
                ))}
              </SettingsCard>
            ) : null}

            {activeTab === "materials" ? (
              <SettingsCard title={t("tradieJobs.materialsTab")}>
                {data.materialUsages.map((m) => (
                  <ReadOnlyField
                    key={m.id}
                    label={`${m.description} × ${m.quantity}`}
                    value={formatMobileCurrency(m.unitPriceExTax ?? 0)}
                  />
                ))}
              </SettingsCard>
            ) : null}

            {activeTab === "photos" ? (
              <SettingsCard title={t("tradieJobs.photosTab")}>
                <ChipSelect
                  label={t("common.filter")}
                  value={photoFilter}
                  options={[
                    { label: t("common.all"), value: "ALL" },
                    { label: "Internal", value: "INTERNAL" },
                    { label: "Customer", value: "CUSTOMER" },
                    { label: "Receipt", value: "RECEIPT" },
                  ]}
                  onChange={(v) => setPhotoFilter(v as typeof photoFilter)}
                />
                {filteredPhotos.map((att) => (
                  <View key={att.id} style={styles.photoRow}>
                    <Image source={{ uri: att.fileKey }} style={styles.thumb} />
                    <View style={styles.photoMeta}>
                      <Text style={styles.photoTitle}>{att.fileName}</Text>
                      <Text style={styles.photoSub}>
                        {`${att.photoCategory ?? "DURING"} · ${att.visibility ?? "INTERNAL"}`}
                      </Text>
                    </View>
                  </View>
                ))}
              </SettingsCard>
            ) : null}
          </>
        )}
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  rowCard: { gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.slate[200] },
  photoRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: DESIGN_TOKENS.colors.slate[200] },
  photoMeta: { flex: 1, gap: 2 },
  photoTitle: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  photoSub: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
});
