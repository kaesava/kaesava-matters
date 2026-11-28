import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DESIGN_TOKENS } from "@kaesava/ui/tokens";
import { addDays, getWeekRange } from "../domain/dateRange";
import { t } from "../i18n";
import { calendarMobileStyles as styles } from "./calendarStyles";

export interface MobileWeekStripProps {
  selectedDateIso: string;
  onSelectDate: (dateIso: string) => void;
  eventCountsByDate?: Record<string, number>;
}

export function MobileWeekStrip({
  selectedDateIso,
  onSelectDate,
  eventCountsByDate = {},
}: MobileWeekStripProps) {
  const { dates } = getWeekRange(selectedDateIso, 1);
  const weekdayLabels = [
    t("calendar.weekdays.mon"),
    t("calendar.weekdays.tue"),
    t("calendar.weekdays.wed"),
    t("calendar.weekdays.thu"),
    t("calendar.weekdays.fri"),
    t("calendar.weekdays.sat"),
    t("calendar.weekdays.sun"),
  ];

  return (
    <View style={styles.stripContainer}>
      <Pressable
        accessibilityLabel={t("calendar.prevWeek")}
        onPress={() => onSelectDate(addDays(selectedDateIso, -7))}
        style={styles.navButton}
      >
        <Ionicons name="chevron-back" size={18} color={DESIGN_TOKENS.colors.textPrimary} />
      </Pressable>
      <View style={styles.daysRow}>
        {dates.map((dateIso, idx) => {
          const isSelected = dateIso === selectedDateIso;
          const hasEvents = (eventCountsByDate[dateIso] ?? 0) > 0;
          return (
            <Pressable
              key={dateIso}
              onPress={() => onSelectDate(dateIso)}
              style={[styles.dayCell, isSelected && styles.dayCellSelected]}
            >
              <Text style={[styles.weekdayText, isSelected && styles.textSelected]}>{weekdayLabels[idx]}</Text>
              <Text style={[styles.dayNumText, isSelected && styles.textSelected]}>{dateIso.slice(8, 10)}</Text>
              {hasEvents ? <View style={[styles.dot, isSelected && styles.dotSelected]} /> : null}
            </Pressable>
          );
        })}
      </View>
      <Pressable
        accessibilityLabel={t("calendar.nextWeek")}
        onPress={() => onSelectDate(addDays(selectedDateIso, 7))}
        style={styles.navButton}
      >
        <Ionicons name="chevron-forward" size={18} color={DESIGN_TOKENS.colors.textPrimary} />
      </Pressable>
    </View>
  );
}
