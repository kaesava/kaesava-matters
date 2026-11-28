import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileButton,
  MobileCardRow,
  MobileSkeletonCard,
  SettingsCard,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { QuoteBuilderModal } from "../../../components/quotes/QuoteBuilderModal";
import { authClient } from "../../../lib/auth";
import { formatMobileCurrency } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";

export default function QuotesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState("ALL");
  const [builderOpen, setBuilderOpen] = useState(false);

  const listQuery = trpc.quotes.list.useQuery(
    status === "ALL" ? undefined : { status },
    { enabled: !!session?.user }
  );
  const quotes = listQuery.data ?? [];

  return (
    <TradieWorkspaceShell title={t("tradieQuotes.title")} showBack onBackPress={() => router.back()}>
      <View style={styles.container}>
        <ChipSelect
          value={status}
          onChange={setStatus}
          options={[
            { label: t("tradieMobile.allFilterOption"), value: "ALL" },
            { label: t("tradieQuotes.statusDraft"), value: "DRAFT" },
            { label: t("tradieQuotes.statusSent"), value: "SENT" },
            { label: t("tradieQuotes.statusAccepted"), value: "ACCEPTED" },
          ]}
        />
        <MobileButton title={t("tradieQuotes.newQuote")} onPress={() => setBuilderOpen(true)} />
        {listQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : quotes.length === 0 ? (
          <SettingsCard title={t("tradieQuotes.title")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyQuotes")}</Text>
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradieQuotes.title")}>
            {quotes.map((q) => (
              <MobileCardRow key={q.id} onPress={() => router.push(`/(app)/quotes/${q.id}` as Href)}>
                <Text style={styles.title}>{`${q.quoteNumber} · ${q.title}`}</Text>
                <Text style={styles.sub}>{`${q.status} · ${formatMobileCurrency(q.totalIncTax)}`}</Text>
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
      <QuoteBuilderModal visible={builderOpen} onClose={() => setBuilderOpen(false)} />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  title: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  sub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
