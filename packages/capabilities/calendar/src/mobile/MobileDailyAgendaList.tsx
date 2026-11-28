import { FlatList, Pressable, Text, View } from "react-native";
import type { CalendarEventItem, CalendarResource } from "../domain/types";
import { t } from "../i18n";
import { MobileVisitAgendaCard } from "./MobileVisitAgendaCard";
import { calendarMobileStyles as styles } from "./calendarStyles";

export interface MobileDailyAgendaListProps {
  dateIso: string;
  events: readonly CalendarEventItem[];
  resources?: readonly CalendarResource[];
  onSelectEvent?: (event: CalendarEventItem) => void;
  onJumpToToday?: () => void;
}

export function MobileDailyAgendaList({
  dateIso,
  events,
  resources = [],
  onSelectEvent,
  onJumpToToday,
}: MobileDailyAgendaListProps) {
  const resourceMap = new Map(resources.map((r) => [r.id, r.name]));
  const sorted = [...events].sort((a, b) => a.startIso.localeCompare(b.startIso));

  return (
    <View style={styles.agendaContainer}>
      <View style={styles.agendaHeader}>
        <Text style={styles.headerDate}>{dateIso}</Text>
        {onJumpToToday ? (
          <Pressable onPress={onJumpToToday} style={styles.todayBtn}>
            <Text style={styles.todayBtnText}>{t("calendar.todayLabel")}</Text>
          </Pressable>
        ) : null}
      </View>
      {sorted.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t("calendar.noEventsForDay")}</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <MobileVisitAgendaCard
              event={item}
              resourceName={item.resourceId ? resourceMap.get(item.resourceId) : undefined}
              onPress={onSelectEvent}
            />
          )}
        />
      )}
    </View>
  );
}
