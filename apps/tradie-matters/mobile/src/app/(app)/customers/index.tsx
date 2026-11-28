import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileCardRow,
  MobileSearchInput,
  MobileSkeletonCard,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { CustomerFormModal } from "../../../components/customers/CustomerFormModal";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

export default function CustomersScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const listQuery = trpc.customers.list.useQuery(
    { search: search.trim() || undefined, limit: 50 },
    { enabled: !!session?.user }
  );
  const customers = listQuery.data ?? [];

  return (
    <TradieWorkspaceShell
      title={t("tradieCrm.customersTitle")}
      user={session?.user}
      onNavigateSettings={() => router.push("/(app)/settings" as Href)}
    >
      <View style={styles.container}>
        <MobileSearchInput
          value={search}
          onChangeText={setSearch}
          placeholder={t("tradieCrm.customersTitle")}
        />
        <MobileButton title={t("tradieCrm.addCustomerAction")} onPress={() => setModalOpen(true)} />
        {listQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : customers.length === 0 ? (
          <SettingsCard title={t("tradieCrm.customersTitle")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyCustomers")}</Text>
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradieCrm.customersTitle")}>
            {customers.map((c) => (
              <MobileCardRow
                key={c.id}
                onPress={() => router.push(`/(app)/customers/${c.id}` as Href)}
              >
                <Text style={styles.rowTitle}>{c.name}</Text>
                <Text style={styles.rowSub}>
                  {c.companyName || c.mobile || c.email || c.customerType}
                </Text>
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
      <CustomerFormModal visible={modalOpen} onClose={() => setModalOpen(false)} />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  rowTitle: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  rowSub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
