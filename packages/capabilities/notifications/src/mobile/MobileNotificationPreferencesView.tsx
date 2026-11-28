import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileButton, SettingsCard, SwitchRow, useAppTheme } from "@kaesava/ui/mobile";

export interface NotificationTopicItem {
  key: string;
  title: string;
  description: string;
  scheduleLabel?: string;
  emailEnabled: boolean;
  pushEnabled?: boolean;
  showPush?: boolean;
}

export interface MobileNotificationPreferencesViewProps {
  topics: NotificationTopicItem[];
  emailAddress?: string;
  pushDeviceCount?: number;
  hideAmounts?: boolean;
  isSaving?: boolean;
  isSendingTest?: boolean;
  onToggleTopic: (topicKey: string, channel: "email" | "push", enabled: boolean) => void;
  onToggleHideAmounts?: (enabled: boolean) => void;
  onSendTest?: () => void;
}

export function MobileNotificationPreferencesView({
  topics,
  emailAddress,
  pushDeviceCount,
  hideAmounts,
  isSaving = false,
  isSendingTest = false,
  onToggleTopic,
  onToggleHideAmounts,
  onSendTest,
}: MobileNotificationPreferencesViewProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {emailAddress && (
        <Text style={[styles.note, { color: colors.textMuted }]}>
          {t("notifications.settings.emailChannelNote", { email: emailAddress })}
        </Text>
      )}
      {typeof pushDeviceCount === "number" && (
        <Text style={[styles.note, { color: colors.textMuted }]}>
          {t("notifications.settings.pushDeviceStatusCount", { count: String(pushDeviceCount) })}
        </Text>
      )}
      {topics.map((topic) => (
        <SettingsCard key={topic.key} title={topic.title}>
          <Text style={[styles.desc, { color: colors.textMuted }]}>{topic.description}</Text>
          {topic.scheduleLabel && <Text style={[styles.schedule, { color: colors.textMuted }]}>{topic.scheduleLabel}</Text>}
          <SwitchRow
            label={t("notifications.settings.emailChannel")}
            value={topic.emailEnabled}
            onValueChange={(val: boolean) => onToggleTopic(topic.key, "email", val)}
            disabled={isSaving}
          />
          {topic.showPush && (
            <SwitchRow
              label={t("notifications.settings.pushChannel")}
              value={Boolean(topic.pushEnabled)}
              onValueChange={(val: boolean) => onToggleTopic(topic.key, "push", val)}
              disabled={isSaving}
            />
          )}
        </SettingsCard>
      ))}
      {onToggleHideAmounts && (
        <SettingsCard title={t("notifications.settings.hideAmountsTitle")}>
          <SwitchRow
            label={t("notifications.settings.hideAmountsTitle")}
            hint={t("notifications.settings.hideAmountsDesc")}
            value={Boolean(hideAmounts)}
            onValueChange={onToggleHideAmounts}
            disabled={isSaving}
          />
        </SettingsCard>
      )}
      {onSendTest && (
        <MobileButton
          title={isSendingTest ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
          variant="secondary"
          onPress={onSendTest}
          loading={isSendingTest}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12 },
  note: { fontSize: 12, lineHeight: 16 },
  desc: { fontSize: 13, lineHeight: 18, marginBottom: 4 },
  schedule: { fontSize: 12, marginBottom: 8 },
});
