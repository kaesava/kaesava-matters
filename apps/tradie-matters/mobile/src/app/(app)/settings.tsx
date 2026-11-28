import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileDetailLinkRow,
  MobilePlatformSettingsShell,
  SettingsCard,
  showMobileConfirm,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import {
  MobileTenantDetailsSection,
  MobileTenantMembersSection,
  MobileUserProfileSettingsSection,
} from "@kaesava/capability-tenant/mobile";
import { SettingsAccountTab } from "../../components/SettingsAccountTab";
import { authClient } from "../../lib/auth";
import { unregisterCachedPushToken } from "../../lib/push";
import { setActiveSessionToken, setActiveTenantId, trpc } from "../../lib/trpc";
import { getMobileVersionInfo } from "../../lib/version";

type SettingsTab = "business" | "profile" | "team" | "account";

export default function SettingsScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [tab, setTab] = useState<SettingsTab>("business");

  const tenantQuery = trpc.getTenant.useQuery(undefined, { enabled: !!session?.user });
  const governanceQuery = trpc.getGovernanceInfo.useQuery(undefined, { enabled: !!session?.user });
  const profileQuery = trpc.getUserProfile.useQuery(undefined, { enabled: !!session?.user });
  const prefQuery = trpc.getUserPreferences.useQuery(undefined, { enabled: !!session?.user });
  const businessQuery = trpc.getBusinessProfile.useQuery(undefined, { enabled: !!session?.user });
  const subQuery = trpc.getSubscriptionStatus.useQuery(undefined, { enabled: !!session?.user });
  const removeTokenMut = trpc.removeToken.useMutation();

  const handleSignOut = () =>
    showMobileConfirm({
      title: t("settings.signOut"),
      message: t("settings.signOutConfirm"),
      confirmText: t("settings.signOut"),
      cancelText: t("common.cancel"),
      isDestructive: true,
      onConfirm: async () => {
        await unregisterCachedPushToken((i) => removeTokenMut.mutateAsync(i));
        await authClient.signOut().catch(() => {});
        setActiveSessionToken(null);
        setActiveTenantId(null);
        router.replace("/(auth)/sign-in" as Href);
      },
    });

  const tenant = tenantQuery.data;
  const isOwner = governanceQuery.data?.userRole === "OWNER";

  return (
    <TradieWorkspaceShell title={t("nav.settings")} user={session?.user} onSignOut={handleSignOut}>
      <MobilePlatformSettingsShell<SettingsTab>
        tabs={[
          { key: "business", label: t("tradieMobile.businessDetailsTab") },
          { key: "profile", label: t("tradieMobile.profileTab") },
          { key: "team", label: t("tradieMobile.teamTab") },
          { key: "account", label: t("tradieMobile.accountTab") },
        ]}
        activeTab={tab}
        onTabChange={setTab}
        footerSlot={<Text style={styles.version}>{getMobileVersionInfo().formattedVersion}</Text>}
      >
        {tab === "business" && (
          <View style={styles.stack}>
            <SettingsCard title={businessQuery.data?.businessName || t("tradieSetup.title")}>
              <Text style={styles.meta}>{businessQuery.data?.gstRegistered ? t("tradieMobile.gstEnabled") : t("tradieMobile.gstDisabled")}</Text>
              <MobileDetailLinkRow label={t("tradieMobile.manageBusinessSetup")} value={businessQuery.data?.tradeType || ""} onPress={() => router.push("/(setup)/business" as Href)} />
            </SettingsCard>
            {tenant && <MobileTenantDetailsSection tenantName={tenant.name} country={tenant.country || "AU"} currency={tenant.currency || "AUD"} timezone={tenant.timezone || "Australia/Melbourne"} isOwner={isOwner} />}
          </View>
        )}
        {tab === "profile" && (
          <View style={styles.stack}>
            <MobileUserProfileSettingsSection displayName={profileQuery.data?.name || session?.user?.name || ""} loginEmail={session?.user?.email || ""} notificationEmail={prefQuery.data?.notificationEmail || session?.user?.email || ""} phoneNumber={profileQuery.data?.phoneNumber || ""} />
            <SettingsCard title={t("tradieMobile.manageNotifications")}>
              <MobileDetailLinkRow label={t("tradieMobile.manageNotifications")} value="" onPress={() => router.push("/(app)/settings/notifications" as Href)} />
              <MobileDetailLinkRow label={t("tradieMobile.manageArchived")} value="" onPress={() => router.push("/(app)/settings/archived" as Href)} />
            </SettingsCard>
          </View>
        )}
        {tab === "team" && <MobileTenantMembersSection members={tenant?.members || []} currentUserId={session?.user?.id || ""} isOwner={isOwner} />}
        {tab === "account" && (
          <SettingsAccountTab
            isOwner={isOwner}
            isSoleOwner={(tenant?.members?.filter((m) => m.isOwner).length ?? 1) <= 1}
            sub={subQuery.data}
            telemetryConsent={(prefQuery.data?.telemetryConsent as "granted" | "denied" | null) ?? null}
            onSignOut={handleSignOut}
          />
        )}
      </MobilePlatformSettingsShell>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 16 },
  meta: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  version: { textAlign: "center", fontSize: 12, color: DESIGN_TOKENS.colors.slate[400], paddingBottom: 16 },
});
