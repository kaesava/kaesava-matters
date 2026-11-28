import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileBadge, MobileButton, SettingsCard, useMobileToast } from "@kaesava/ui/mobile";
import {
  MobileDataPrivacyAndExportSection,
  MobileTenantDangerZoneSection,
} from "@kaesava/capability-tenant/mobile";
import { trpc } from "../lib/trpc";

interface Props {
  isOwner: boolean;
  isSoleOwner: boolean;
  sub?: { isSubscribed?: boolean } | null;
  telemetryConsent: "granted" | "denied" | null;
  onSignOut: () => void;
}

export function SettingsAccountTab({ isOwner, isSoleOwner, sub, telemetryConsent, onSignOut }: Props) {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const updatePrefMut = trpc.updateUserPreferences.useMutation({ onSuccess: () => utils.getUserPreferences.invalidate() });
  const leaveMut = trpc.leaveTenant.useMutation({ onSuccess: () => router.replace("/(auth)/complete-profile" as Href) });
  const deleteMut = trpc.deleteMyAccount.useMutation({ onSuccess: () => router.replace("/(auth)/sign-in" as Href) });

  return (
    <View style={styles.stack}>
      {sub && (
        <SettingsCard title={t("subscription.sectionTitle")}>
          <MobileBadge variant={sub.isSubscribed ? "success" : "warning"}>
            {sub.isSubscribed ? t("subscription.activeBadge") : t("subscription.tierExpired")}
          </MobileBadge>
          <MobileButton title={t("subscription.manageSubscription")} variant="secondary" onPress={() => Linking.openURL("https://tradiematters.kaesava.au/dashboard")} />
        </SettingsCard>
      )}
      <MobileDataPrivacyAndExportSection
        telemetryConsent={telemetryConsent}
        onToggleTelemetry={async (granted) => { await updatePrefMut.mutateAsync({ telemetryConsent: granted ? "granted" : "denied" }); }}
        onExportData={async () => { await utils.exportData.fetch(); toast.success(t("tradieMobile.exportReadyToast")); }}
        onOpenPrivacyPolicy={() => Linking.openURL("https://tradiematters.kaesava.au/privacy")}
      />
      <MobileTenantDangerZoneSection
        isOwner={isOwner}
        isSoleOwner={isSoleOwner}
        isSubmitting={leaveMut.isPending || deleteMut.isPending}
        onLeave={async () => { await leaveMut.mutateAsync(undefined); }}
        onDelete={async () => { await deleteMut.mutateAsync(undefined); }}
      />
      <MobileButton title={t("settings.signOut")} variant="secondary" onPress={onSignOut} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: 16 } });
