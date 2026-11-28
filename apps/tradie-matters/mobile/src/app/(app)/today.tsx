import React, { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  getWeekRange,
  toIsoDateString,
  type CalendarEventItem,
} from "@kaesava/capability-calendar";
import {
  MobileDailyAgendaList,
  MobileVisitAgendaCard,
  MobileWeekStrip,
} from "@kaesava/capability-calendar/mobile";
import { DESIGN_TOKENS, MobileButton } from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { OnMyWaySmsButton } from "../../components/jobs/OnMyWaySmsButton";
import { MobilePaydayCashPulseCard } from "../../components/pulse/MobilePaydayCashPulseCard";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

export default function TodayScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const todayIso = useMemo(() => toIsoDateString(new Date()), []);
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);

  const weekRange = useMemo(() => getWeekRange(selectedDateIso, 1), [selectedDateIso]);
  const tenantQuery = trpc.getTenant.useQuery(undefined, { enabled: !!session?.user });
  const profileQuery = trpc.getBusinessProfile.useQuery(undefined, { enabled: !!session?.user });
  const boardQuery = trpc.dispatch.getBoard.useQuery(
    {
      rangeStart: `${weekRange.startIso}T00:00:00.000Z`,
      rangeEnd: `${weekRange.endIso}T23:59:59.999Z`,
    },
    { enabled: !!session?.user }
  );

  const { dayEvents, countsByDate, visitJobMap, nextVisitEvent } = useMemo(() => {
    const visits = boardQuery.data?.visits ?? [];
    const counts: Record<string, number> = {};
    const jobMap = new Map<string, string>();
    const allEvents: CalendarEventItem[] = visits.map((v) => {
      const startIso = new Date(v.scheduledStart).toISOString();
      const endIso = new Date(v.scheduledEnd).toISOString();
      const dayKey = startIso.slice(0, 10);
      counts[dayKey] = (counts[dayKey] ?? 0) + 1;
      jobMap.set(v.id, v.jobId);
      return {
        id: v.id,
        title: v.visitTitle || t("tradieJobs.scheduleVisitAction"),
        subtitle: v.visitNotes ?? undefined,
        startIso,
        endIso,
        resourceId: null,
        badge: v.status,
      };
    });
    const forDay = allEvents.filter((e) => e.startIso.slice(0, 10) === selectedDateIso);
    return { dayEvents: forDay, countsByDate: counts, visitJobMap: jobMap, nextVisitEvent: forDay[0] };
  }, [boardQuery.data?.visits, selectedDateIso]);

  const unscheduledCount = boardQuery.data?.unscheduledJobs.length ?? 0;
  const nextVisitJobId = nextVisitEvent ? visitJobMap.get(nextVisitEvent.id) : undefined;
  const tradieName = session?.user?.name || profileQuery.data?.businessName || t("tradieMobile.appName");

  return (
    <TradieWorkspaceShell
      title={t("tradieMobile.todayTitle")}
      user={session?.user}
      scrollable={false}
      onNavigateSettings={() => router.push("/(app)/settings" as Href)}
      topBannerSlot={
        unscheduledCount > 0 ? (
          <Text style={styles.bannerText}>
            {t("tradieMobile.unscheduledBanner", { count: String(unscheduledCount) })}
          </Text>
        ) : undefined
      }
    >
      <View style={styles.container}>
        {!profileQuery.isLoading && !profileQuery.data ? (
          <MobileButton
            title={t("tradieMobile.setupIncompleteAction")}
            onPress={() => router.push("/(setup)/business" as Href)}
          />
        ) : null}
        <MobileWeekStrip
          selectedDateIso={selectedDateIso}
          onSelectDate={setSelectedDateIso}
          eventCountsByDate={countsByDate}
        />
        <MobilePaydayCashPulseCard isOwner={tenantQuery.data?.currentUserRole === "OWNER"} />
        {nextVisitEvent ? (
          <>
            <MobileVisitAgendaCard
              event={nextVisitEvent}
              onPress={(ev) => {
                const jobId = visitJobMap.get(ev.id);
                if (jobId) router.push(`/(app)/jobs/${jobId}` as Href);
              }}
            />
            {nextVisitJobId ? <OnMyWaySmsButton jobId={nextVisitJobId} tradieName={tradieName} /> : null}
          </>
        ) : null}
        <View style={styles.listWrap}>
          <MobileDailyAgendaList
            dateIso={selectedDateIso}
            events={dayEvents}
            onJumpToToday={() => setSelectedDateIso(todayIso)}
            onSelectEvent={(ev) => {
              const jobId = visitJobMap.get(ev.id);
              if (jobId) router.push(`/(app)/jobs/${jobId}` as Href);
            }}
          />
        </View>
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12 },
  listWrap: { flex: 1 },
  bannerText: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.textMuted },
});
