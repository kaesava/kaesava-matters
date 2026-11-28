import React, { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
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
import { DESIGN_TOKENS, MobileButton, MobileDetailLinkRow } from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { OnMyWaySmsButton } from "../../components/jobs/OnMyWaySmsButton";
import { MobilePaydayCashPulseCard } from "../../components/pulse/MobilePaydayCashPulseCard";
import { authClient } from "../../lib/auth";
import { formatIsoDate } from "../../lib/format";
import { trpc } from "../../lib/trpc";

export default function TodayScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const todayIso = useMemo(() => toIsoDateString(new Date()), []);
  const [selectedDateIso, setSelectedDateIso] = useState(todayIso);

  const weekRange = useMemo(() => getWeekRange(selectedDateIso, 1), [selectedDateIso]);
  const governanceQuery = trpc.getGovernanceInfo.useQuery(undefined, { enabled: !!session?.user });
  const profileQuery = trpc.getBusinessProfile.useQuery(undefined, { enabled: !!session?.user });
  const boardQuery = trpc.dispatch.getBoard.useQuery(
    {
      rangeStart: `${weekRange.startIso}T00:00:00.000Z`,
      rangeEnd: `${weekRange.endIso}T23:59:59.999Z`,
    },
    { enabled: !!session?.user }
  );

  const { dayEvents, countsByDate, visitJobMap, visitAddressMap, nextVisitEvent } = useMemo(() => {
    const visits = boardQuery.data?.visits ?? [];
    const currentUserId = session?.user?.id;
    const isOwnerOrAdmin =
      governanceQuery.data?.userRole === "OWNER" ||
      governanceQuery.data?.userRole === "ADMIN";
    const filteredVisits = visits.filter((v) => {
      if (isOwnerOrAdmin) return true;
      const assigned = (v as { assignedToUserId?: string | null }).assignedToUserId;
      return !assigned || assigned === currentUserId;
    });
    const counts: Record<string, number> = {};
    const jobMap = new Map<string, string>();
    const addrMap = new Map<string, string>();
    const allEvents: CalendarEventItem[] = filteredVisits.map((v) => {
      const startIso = new Date(v.scheduledStart).toISOString();
      const endIso = new Date(v.scheduledEnd).toISOString();
      const dayKey = formatIsoDate(v.scheduledStart);
      counts[dayKey] = (counts[dayKey] ?? 0) + 1;
      jobMap.set(v.id, v.jobId);
      const siteAddr = (v as { siteAddress?: string | null }).siteAddress;
      if (siteAddr) addrMap.set(v.id, siteAddr);
      return {
        id: v.id,
        title: (v as { title?: string | null }).title || t("tradieJobs.scheduleVisitAction"),
        subtitle: v.visitNotes ?? undefined,
        startIso,
        endIso,
        resourceId: null,
        badge: v.status,
      };
    });
    const forDay = allEvents.filter((e) => formatIsoDate(e.startIso) === selectedDateIso);
    return {
      dayEvents: forDay,
      countsByDate: counts,
      visitJobMap: jobMap,
      visitAddressMap: addrMap,
      nextVisitEvent: forDay[0],
    };
  }, [boardQuery.data?.visits, selectedDateIso, session?.user?.id, governanceQuery.data?.userRole]);

  const unscheduledCount = boardQuery.data?.unscheduledJobs.length ?? 0;
  const nextVisitJobId = nextVisitEvent ? visitJobMap.get(nextVisitEvent.id) : undefined;
  const nextVisitAddress = nextVisitEvent ? visitAddressMap.get(nextVisitEvent.id) : undefined;
  const tradieName = session?.user?.name || profileQuery.data?.businessName || t("tradieMobile.appName");

  return (
    <TradieWorkspaceShell
      title={t("tradieMobile.todayTitle")}
      user={session?.user}
      scrollable={true}
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
        <MobilePaydayCashPulseCard isOwner={governanceQuery.data?.userRole === "OWNER"} />
        {nextVisitEvent ? (
          <>
            <MobileVisitAgendaCard
              event={nextVisitEvent}
              onPress={(ev) => {
                const jobId = visitJobMap.get(ev.id);
                if (jobId) router.push(`/(app)/jobs/${jobId}` as Href);
              }}
            />
            {nextVisitAddress ? (
              <MobileDetailLinkRow
                label={t("tradieMobile.openInMapsAction")}
                value={nextVisitAddress}
                onPress={() =>
                  void Linking.openURL(
                    `https://maps.google.com/?q=${encodeURIComponent(nextVisitAddress)}`
                  )
                }
              />
            ) : null}
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
