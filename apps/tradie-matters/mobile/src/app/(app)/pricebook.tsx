import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileButton,
  MobileCardRow,
  MobileSearchInput,
  MobileSkeletonCard,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../components/TradieWorkspaceShell";
import {
  PricebookItemModal,
  type PricebookItemInitial,
} from "../../components/pricebook/PricebookItemModal";
import { authClient } from "../../lib/auth";
import { formatMobileCurrency } from "../../lib/format";
import { trpc } from "../../lib/trpc";

type ItemTypeFilter = "ALL" | "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACT";

export default function PricebookScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [query, setQuery] = useState("");
  const [itemType, setItemType] = useState<ItemTypeFilter>("ALL");
  const [editing, setEditing] = useState<PricebookItemInitial | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const searchQuery = trpc.pricebook.fuzzySearch.useQuery(
    { query: query.trim(), itemType: itemType === "ALL" ? undefined : itemType, limit: 50 },
    { enabled: !!session?.user }
  );
  const starterMut = trpc.pricebook.installStarterPack.useMutation({
    onSuccess: () => {
      void utils.pricebook.invalidate();
      toast.success(t("tradieMobile.starterPackInstalledToast"));
    },
  });

  const items = searchQuery.data ?? [];

  return (
    <TradieWorkspaceShell
      title={t("tradieCrm.pricebookTitle")}
      user={session?.user}
      onNavigateSettings={() => router.push("/(app)/settings" as Href)}
    >
      <View style={styles.container}>
        <MobileSearchInput value={query} onChangeText={setQuery} placeholder={t("tradieCrm.pricebookTitle")} />
        <ChipSelect
          value={itemType}
          onChange={(v) => setItemType(v as ItemTypeFilter)}
          options={[
            { label: t("tradieMobile.allFilterOption"), value: "ALL" },
            { label: "Material", value: "MATERIAL" },
            { label: "Labour", value: "LABOUR" },
            { label: "Equipment", value: "EQUIPMENT" },
          ]}
        />
        <MobileButton
          title={t("tradieCrm.addPricebookItemAction")}
          onPress={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        />
        {searchQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : items.length === 0 ? (
          <SettingsCard title={t("tradieCrm.pricebookTitle")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyPricebook")}</Text>
            <MobileButton
              title={t("tradieCrm.installStarterPackAction")}
              variant="secondary"
              loading={starterMut.isPending}
              onPress={() => starterMut.mutate({ packKey: "GENERAL" })}
            />
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradieCrm.pricebookTitle")}>
            {items.map((item) => (
              <MobileCardRow
                key={item.id}
                onPress={() => {
                  setEditing(item);
                  setModalOpen(true);
                }}
              >
                <View style={styles.rowBetween}>
                  <View style={styles.rowMain}>
                    <Text style={styles.rowTitle}>{item.name}</Text>
                    <Text style={styles.rowSub}>
                      {[item.sku, item.supplierName, item.taxCode].filter(Boolean).join(" · ")}
                    </Text>
                  </View>
                  <Text style={styles.price}>{formatMobileCurrency(item.sellPriceExTax)}</Text>
                </View>
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
      <PricebookItemModal visible={modalOpen} onClose={() => setModalOpen(false)} initial={editing} />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  rowMain: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  rowSub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  price: { fontSize: 14, fontWeight: "700", color: DESIGN_TOKENS.colors.textPrimary, fontVariant: ["tabular-nums"] },
});
