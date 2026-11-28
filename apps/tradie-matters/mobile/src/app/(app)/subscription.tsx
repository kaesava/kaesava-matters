import React from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileButton, MobileSkeletonCard, ReadOnlyField, SettingsCard } from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

export default function SubscriptionScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const subQuery = trpc.getSubscriptionStatus.useQuery(undefined, { enabled: !!session?.user });
  const sub = subQuery.data;

  return (
    <TradieWorkspaceShell
      title={t("tradieMobile.subscriptionTitle")}
      showBack
      onBackPress={() => router.back()}
      user={session?.user}
    >
      <View style={styles.container}>
        {subQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : (
          <SettingsCard title={t("tradieMobile.subscriptionTitle")}>
            <ReadOnlyField label={t("tradieMobile.planLabel")} value={sub?.status ?? "FREE"} />
            <ReadOnlyField label={t("tradieJobs.statusLabel")} value={sub?.status ?? "ACTIVE"} />
            <MobileButton
              title={t("tradieMobile.manageBillingAction")}
              onPress={() => void Linking.openURL("https://tradiematters.kaesava.au/settings?tab=billing")}
            />
          </SettingsCard>
        )}
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
});
