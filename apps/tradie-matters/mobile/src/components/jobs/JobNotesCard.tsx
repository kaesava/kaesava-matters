import React, { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { t } from "@kaesava/i18n";
import {
  enqueueMutation,
  useOfflineDraftAutoSave,
  useOutboxSync,
} from "@kaesava/mobile-core";
import { DESIGN_TOKENS, MobileButton, MobileInput, SettingsCard, useMobileToast } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface JobNotesCardProps {
  tenantId: string;
  userId: string;
  jobId: string;
  initialNotes?: string | null;
}

export function JobNotesCard({ tenantId, userId, jobId, initialNotes }: JobNotesCardProps) {
  const toast = useMobileToast();
  const { isOnline, syncNow } = useOutboxSync();
  const utils = trpc.useUtils();
  const [notes, setNotes] = useState(initialNotes ?? "");

  const { isSaving, lastSavedAt, loadDraft, clearDraft } = useOfflineDraftAutoSave<string>({
    tenantId,
    userId,
    draftKey: `job_notes:${jobId}`,
    value: notes,
    debounceMs: 150,
    enabled: Boolean(tenantId && userId && jobId),
  });

  useEffect(() => {
    let active = true;
    void loadDraft().then((saved: string | null) => {
      if (active && saved !== null) setNotes(saved);
    });
    return () => {
      active = false;
    };
  }, [loadDraft]);

  const updateMut = trpc.jobs.update.useMutation({
    onSuccess: async () => {
      await clearDraft();
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.notesSavedToast"));
    },
  });

  const handleSave = async () => {
    if (!isOnline) {
      await enqueueMutation({
        tenantId,
        userId,
        procedure: "jobs.update",
        payload: { id: jobId, internalNotes: notes },
      });
      await clearDraft();
      toast.info(t("tradieMobile.queuedOfflineToast"));
      void syncNow();
      return;
    }
    updateMut.mutate({ id: jobId, internalNotes: notes });
  };

  return (
    <SettingsCard title={t("tradieMobile.jobNotesLabel")}>
      <MobileInput value={notes} onChangeText={setNotes} multiline />
      {isSaving ? (
        <Text style={styles.status}>{t("tradieMobile.notesSavingLabel")}</Text>
      ) : lastSavedAt ? (
        <Text style={styles.status}>{t("tradieMobile.notesSavedLabel")}</Text>
      ) : null}
      <MobileButton
        title={t("tradieMobile.notesSaveAction")}
        variant="secondary"
        loading={updateMut.isPending}
        onPress={() => void handleSave()}
      />
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  status: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
});
