import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileBadge,
  MobileButton,
  MobileCardRow,
  MobileSearchInput,
  MobileSkeletonCard,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { CreateJobModal } from "../../../components/jobs/CreateJobModal";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

type JobFilterStatus = "ALL" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED";

export default function JobsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<JobFilterStatus>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  const listQuery = trpc.jobs.list.useQuery(
    {
      search: search.trim() || undefined,
      status: status === "ALL" ? undefined : status,
      limit: 50,
    },
    { enabled: !!session?.user }
  );
  const jobs = listQuery.data ?? [];

  return (
    <TradieWorkspaceShell
      title={t("tradieJobs.jobsTitle")}
      user={session?.user}
      onNavigateSettings={() => router.push("/(app)/settings" as Href)}
    >
      <View style={styles.container}>
        <MobileSearchInput value={search} onChangeText={setSearch} placeholder={t("tradieJobs.jobsTitle")} />
        <ChipSelect
          value={status}
          onChange={(v) => setStatus(v as JobFilterStatus)}
          options={[
            { label: t("tradieMobile.allFilterOption"), value: "ALL" },
            { label: t("tradieJobs.statusScheduled"), value: "SCHEDULED" },
            { label: t("tradieJobs.statusInProgress"), value: "IN_PROGRESS" },
            { label: t("tradieJobs.statusCompleted"), value: "COMPLETED" },
          ]}
        />
        <MobileButton title={t("tradieJobs.createJobAction")} onPress={() => setCreateOpen(true)} />
        {listQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : jobs.length === 0 ? (
          <SettingsCard title={t("tradieJobs.jobsTitle")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyJobs")}</Text>
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradieJobs.jobsTitle")}>
            {jobs.map((job) => (
              <MobileCardRow
                key={job.id}
                onPress={() => router.push(`/(app)/jobs/${job.id}` as Href)}
              >
                <Text style={styles.rowTitle}>{`${job.jobNumber} · ${job.title}`}</Text>
                <Text style={styles.rowSub}>{job.status}</Text>
                {job.hasUnbilledExtras ? (
                  <MobileBadge variant="warning">{t("tradieJobs.unbilledExtrasBadge")}</MobileBadge>
                ) : null}
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
      <CreateJobModal visible={createOpen} onClose={() => setCreateOpen(false)} />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  rowTitle: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  rowSub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
