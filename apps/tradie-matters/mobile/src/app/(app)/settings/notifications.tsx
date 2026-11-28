import React, { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileButton, MobileScreenWrapper, SettingsCard, SwitchRow, showMobileConfirm, useMobileToast } from "@kaesava/ui/mobile";
import { authClient } from "../../../lib/auth";
import { getPushPlatform, registerPushNotificationsAsync, unregisterCachedPushToken } from "../../../lib/push";
import { trpc } from "../../../lib/trpc";

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [pushBusy, setPushBusy] = useState(false);

  const prefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: !!session?.user });
  const channelQuery = trpc.getNotificationChannelStatus.useQuery(undefined, { enabled: !!session?.user });
  const registerMut = trpc.registerToken.useMutation();
  const removeMut = trpc.removeToken.useMutation();
  const updateMut = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });
  const testMut = trpc.sendTestNotification.useMutation({
    onSuccess: () => toast.success(t("toasts.saved")),
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const appId = prefQuery.data?.appId;
  const saved = (appId && (prefQuery.data?.appPreferences as Record<string, Record<string, unknown>>)?.[appId]) || {};
  const showPush = (channelQuery.data?.mobilePushDeviceCount ?? 0) > 0;

  const handleTogglePush = async (enabled: boolean) => {
    setPushBusy(true);
    try {
      if (enabled) {
        const token = await registerPushNotificationsAsync();
        if (!token) {
          showMobileConfirm({
            title: t("notifications.settings.pushBlockedTitle"),
            message: t("notifications.settings.pushBlockedDesc"),
            confirmText: t("notifications.settings.openSystemSettings"),
            cancelText: t("common.cancel"),
            onConfirm: () => { Linking.openSettings().catch(() => {}); },
          });
          return;
        }
        await registerMut.mutateAsync({ token, platform: getPushPlatform() });
      } else {
        await unregisterCachedPushToken((i) => removeMut.mutateAsync(i));
      }
      await utils.getNotificationChannelStatus.invalidate();
    } finally { setPushBusy(false); }
  };

  return (
    <MobileScreenWrapper title={t("tradieMobile.manageNotifications")} user={session?.user} showBack onBackPress={() => router.back()}>
      <View style={styles.container}>
        <SettingsCard title={t("notifications.settings.pushChannel")}>
          <SwitchRow label={t("notifications.settings.pushChannel")} value={showPush} disabled={pushBusy} onValueChange={handleTogglePush} />
        </SettingsCard>
        <SettingsCard title={t("notifications.settings.weeklyDigestTitle")}>
          <Text style={styles.desc}>{t("notifications.settings.weeklyDigestDesc")}</Text>
          <SwitchRow
            label={t("notifications.settings.emailChannel")}
            value={saved.weekly_digest_email !== false}
            disabled={updateMut.isPending}
            onValueChange={(val) => {
              if (!appId) return;
              updateMut.mutate({ appPreferences: { [appId]: { ...saved, weekly_digest_email: val } } });
            }}
          />
          {showPush && (
            <SwitchRow
              label={t("notifications.settings.pushChannel")}
              value={saved.weekly_digest_push !== false}
              disabled={updateMut.isPending}
              onValueChange={(val) => {
                if (!appId) return;
                updateMut.mutate({ appPreferences: { [appId]: { ...saved, weekly_digest_push: val } } });
              }}
            />
          )}
        </SettingsCard>
        <MobileButton title={t("notifications.settings.sendTestButton")} variant="secondary" loading={testMut.isPending} onPress={() => testMut.mutate({ channel: "all" })} />
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  desc: { fontSize: 13, color: "#64748b", marginBottom: 4 },
});
