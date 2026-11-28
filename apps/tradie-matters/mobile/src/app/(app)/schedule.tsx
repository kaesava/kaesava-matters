import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import { getWeekRange, toIsoDateString } from "@kaesava/capability-calendar";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileButton,
  MobileDetailLinkRow,
  MobileInput,
  MobileModalDialog,
  MobileSkeletonCard,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { authClient } from "../../lib/auth";
import { formatDate } from "../../lib/format";
import { trpc } from "../../lib/trpc";

export default function ScheduleScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const todayIso = useMemo(() => toIsoDateString(new Date()), []);
  const weekRange = useMemo(() => getWeekRange(todayIso, 1), [todayIso]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [visitTitle, setVisitTitle] = useState("");
  const [startDate, setStartDate] = useState(todayIso);

  const boardQuery = trpc.dispatch.getBoard.useQuery(
    {
      rangeStart: `${weekRange.startIso}T00:00:00.000Z`,
      rangeEnd: `${weekRange.endIso}T23:59:59.999Z`,
    },
    { enabled: !!session?.user }
  );

  const scheduleMut = trpc.dispatch.createVisit.useMutation({
    onSuccess: () => {
      void utils.dispatch.invalidate();
      toast.success(t("common.saved"));
      setModalOpen(false);
      setVisitTitle("");
    },
    onError: (err) => toast.error(err.message),
  });

  const unscheduled = boardQuery.data?.unscheduledJobs ?? [];
  const visits = boardQuery.data?.visits ?? [];

  return (
    <TradieWorkspaceShell
      title={t("tradieJobs.scheduleVisitAction")}
      showBack
      onBackPress={() => router.back()}
      user={session?.user}
    >
      <View style={styles.container}>
        <MobileButton
          title={t("tradieJobs.scheduleVisitAction")}
          onPress={() => setModalOpen(true)}
        />

        {boardQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : (
          <>
            <SettingsCard title={t("tradieMobile.upcomingVisitsTitle")}>
              {visits.length === 0 ? (
                <Text style={styles.empty}>{t("common.noResults")}</Text>
              ) : (
                visits.map((v) => (
                  <MobileDetailLinkRow
                    key={v.id}
                    label={v.title || t("tradieJobs.scheduleVisitAction")}
                    value={`${formatDate(v.scheduledStart)} · ${v.status}`}
                    onPress={() => router.push(`/(app)/jobs/${v.jobId}` as Href)}
                  />
                ))
              )}
            </SettingsCard>

            {unscheduled.length > 0 ? (
              <SettingsCard title={t("tradieMobile.unscheduledJobsTitle")}>
                {unscheduled.map((job) => (
                  <MobileDetailLinkRow
                    key={job.id}
                    label={`${job.jobNumber} · ${job.title}`}
                    value={job.status}
                    onPress={() => {
                      setSelectedJobId(job.id);
                      setVisitTitle(job.title);
                      setModalOpen(true);
                    }}
                  />
                ))}
              </SettingsCard>
            ) : null}
          </>
        )}
      </View>

      <MobileModalDialog
        visible={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t("tradieJobs.scheduleVisitAction")}
        footer={
          <MobileButton
            title={t("common.save")}
            loading={scheduleMut.isPending}
            disabled={!selectedJobId || scheduleMut.isPending}
            onPress={() =>
              scheduleMut.mutate({
                jobId: selectedJobId,
                visitTitle: visitTitle.trim() || t("tradieJobs.scheduleVisitAction"),
                scheduledStart: `${startDate}T09:00:00.000Z`,
                scheduledEnd: `${startDate}T11:00:00.000Z`,
              })
            }
          />
        }
      >
        <View style={styles.form}>
          <ChipSelect
            label={t("tradieMobile.selectJobLabel")}
            value={selectedJobId}
            onChange={setSelectedJobId}
            options={unscheduled.map((j) => ({ label: `${j.jobNumber} · ${j.title}`, value: j.id }))}
          />
          <MobileInput
            label={t("tradieJobs.visitTitleLabel")}
            value={visitTitle}
            onChangeText={setVisitTitle}
          />
          <MobileInput
            label={t("common.date")}
            value={startDate}
            onChangeText={setStartDate}
            placeholder="YYYY-MM-DD"
          />
        </View>
      </MobileModalDialog>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  form: { gap: 12 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
