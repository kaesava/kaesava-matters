import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "@kaesava/ui/tokens";
import { formatTimeRangeLabel } from "../domain/dateRange";
import type { CalendarEventItem } from "../domain/types";
import { calendarMobileStyles as styles } from "./calendarStyles";

export interface MobileVisitAgendaCardProps {
  event: CalendarEventItem;
  resourceName?: string;
  onPress?: (event: CalendarEventItem) => void;
}

export function MobileVisitAgendaCard({
  event,
  resourceName,
  onPress,
}: MobileVisitAgendaCardProps) {
  return (
    <Pressable
      onPress={() => onPress?.(event)}
      disabled={!onPress}
      style={[
        styles.card,
        event.accentColor ? { borderLeftWidth: 4, borderLeftColor: event.accentColor } : undefined,
      ]}
    >
      <View style={styles.cardContent}>
        <View style={styles.cardTopRow}>
          <Text style={styles.timeText}>{formatTimeRangeLabel(event.startIso, event.endIso)}</Text>
          {event.badge ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{event.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.titleText} numberOfLines={1}>
          {event.title}
        </Text>
        {event.subtitle || resourceName ? (
          <Text style={styles.subtitleText} numberOfLines={1}>
            {[resourceName, event.subtitle].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </View>
      {onPress ? (
        <Ionicons name="chevron-forward" size={18} color={DESIGN_TOKENS.colors.subtleText} />
      ) : null}
    </Pressable>
  );
}
