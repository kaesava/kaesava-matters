import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import { enqueueMutation, useOutboxSync } from "@kaesava/mobile-core";
import { DESIGN_TOKENS, MobileButton, SettingsCard, useMobileToast } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface CheckInOutTimerBarProps {
  tenantId: string;
  userId: string;
  visitId?: string | null;
  activeCheckInIso?: string | null;
}

function formatElapsed(startIso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(startIso).getTime()) / 1000));
  const hrs = String(Math.floor(diffSec / 3600)).padStart(2, "0");
  const mins = String(Math.floor((diffSec % 3600) / 60)).padStart(2, "0");
  const secs = String(diffSec % 60).padStart(2, "0");
  return `${hrs}:${mins}:${secs}`;
}

export function CheckInOutTimerBar({ tenantId, userId, visitId, activeCheckInIso }: CheckInOutTimerBarProps) {
  const toast = useMobileToast();
  const { isOnline, syncNow } = useOutboxSync();
  const utils = trpc.useUtils();
  const [localCheckInIso, setLocalCheckInIso] = useState<string | null>(activeCheckInIso ?? null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setLocalCheckInIso(activeCheckInIso ?? null);
  }, [activeCheckInIso]);

  useEffect(() => {
    if (!localCheckInIso) return;
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, [localCheckInIso]);

  const checkInMut = trpc.field.checkInVisit.useMutation({
    onSuccess: () => {
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.checkedInToast"));
    },
  });
  const checkOutMut = trpc.field.checkOutVisit.useMutation({
    onSuccess: () => {
      void utils.jobs.invalidate();
      setLocalCheckInIso(null);
      toast.success(t("tradieMobile.checkedOutToast"));
    },
  });

  const handleToggle = async () => {
    if (!visitId) return;
    const timestamp = new Date().toISOString();
    const isCheckedIn = Boolean(localCheckInIso);
    const procedure = isCheckedIn ? "field.checkOutVisit" : "field.checkInVisit";
    if (!isOnline) {
      await enqueueMutation({ tenantId, userId, procedure, payload: { visitId, timestamp, isBillable: true } });
      setLocalCheckInIso(isCheckedIn ? null : timestamp);
      toast.info(t("tradieMobile.queuedOfflineToast"));
      void syncNow();
      return;
    }
    if (isCheckedIn) checkOutMut.mutate({ visitId, timestamp, isBillable: true });
    else {
      setLocalCheckInIso(timestamp);
      checkInMut.mutate({ visitId, timestamp });
    }
  };

  return (
    <SettingsCard title={t("tradieJobs.timeEntriesTitle")}>
      <View style={styles.row}>
        <View style={styles.timerBox}>
          <Text style={styles.label}>{t("tradieMobile.elapsedTimeLabel")}</Text>
          <Text style={styles.timer}>
            {localCheckInIso ? formatElapsed(localCheckInIso, nowMs) : visitId ? "00:00:00" : t("tradieMobile.noVisitScheduled")}
          </Text>
        </View>
        <MobileButton
          title={localCheckInIso ? t("tradieJobs.checkOutAction") : t("tradieJobs.checkInAction")}
          disabled={!visitId || checkInMut.isPending || checkOutMut.isPending}
          loading={checkInMut.isPending || checkOutMut.isPending}
          onPress={() => void handleToggle()}
        />
      </View>
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  timerBox: { flex: 1, gap: 2 },
  label: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  timer: { fontSize: 18, fontWeight: "700", color: DESIGN_TOKENS.colors.textPrimary, fontVariant: ["tabular-nums"] },
});
