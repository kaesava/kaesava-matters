import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, MobileSkeletonCard, ReadOnlyField, SettingsCard } from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";

export default function SuppliersScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const suppliersQuery = trpc.suppliers.list.useQuery(undefined, { enabled: !!session?.user });

  return (
    <TradieWorkspaceShell
      title={t("tradieMobile.suppliersTitle")}
      showBack
      onBackPress={() => router.back()}
      user={session?.user}
    >
      <View style={styles.container}>
        {suppliersQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : (
          <SettingsCard title={t("tradieMobile.suppliersTitle")}>
            {(suppliersQuery.data ?? []).length === 0 ? (
              <Text style={styles.empty}>{t("common.noResults")}</Text>
            ) : (
              (suppliersQuery.data ?? []).map((sup) => (
                <ReadOnlyField
                  key={sup.id}
                  label={sup.name}
                  value={sup.email || sup.phone || "—"}
                />
              ))
            )}
          </SettingsCard>
        )}
      </View>
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
