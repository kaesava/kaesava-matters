import React from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileBadge, MobileButton, SettingsCard, useMobileToast } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";
import type { JobDto } from "../../lib/trpc-types";

interface InboxLeadCardProps {
  job: JobDto;
  onOpenJob: (jobId: string) => void;
}

export function InboxLeadCard({ job, onOpenJob }: InboxLeadCardProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const updateMut = trpc.jobs.update.useMutation();

  const handleConvert = async () => {
    await updateMut.mutateAsync({ id: job.id, status: "QUOTED" });
    void utils.jobs.invalidate();
    toast.success(t("tradieMobile.leadConvertedToast"));
  };

  return (
    <SettingsCard title={`${job.jobNumber} · ${job.title}`}>
      <View style={styles.row}>
        <MobileBadge variant="primary">{job.status}</MobileBadge>
      </View>
      <View style={styles.actions}>
        <MobileButton
          title={t("tradieMobile.convertLeadAction")}
          loading={updateMut.isPending}
          onPress={() => void handleConvert()}
        />
        <MobileButton
          title={t("tradieMobile.jobDetailsTitle")}
          variant="secondary"
          onPress={() => onOpenJob(job.id)}
        />
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  actions: { gap: 8 },
});