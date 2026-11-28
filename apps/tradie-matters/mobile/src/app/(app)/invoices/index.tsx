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
import { ConvertJobInvoiceSheet } from "../../../components/invoices/ConvertJobInvoiceSheet";
import { authClient } from "../../../lib/auth";
import { formatMobileCurrency } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";

export default function InvoicesScreen() {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const [status, setStatus] = useState("ALL");
  const [convertOpen, setConvertOpen] = useState(false);

  const listQuery = trpc.invoices.list.useQuery(
    status === "ALL" ? undefined : { status },
    { enabled: !!session?.user }
  );
  const invoices = listQuery.data ?? [];

  return (
    <TradieWorkspaceShell title={t("tradieInvoices.title")} showBack onBackPress={() => router.back()}>
      <View style={styles.container}>
        <ChipSelect
          value={status}
          onChange={setStatus}
          options={[
            { label: t("tradieMobile.allFilterOption"), value: "ALL" },
            { label: t("tradieInvoices.statusDraft"), value: "DRAFT" },
            { label: t("tradieInvoices.statusSent"), value: "SENT" },
            { label: t("tradieInvoices.statusPaid"), value: "PAID" },
            { label: t("tradieInvoices.statusOverdue"), value: "OVERDUE" },
          ]}
        />
        <MobileButton title={t("tradieInvoices.convertJobToInvoice")} onPress={() => setConvertOpen(true)} />
        {listQuery.isLoading ? (
          <MobileSkeletonCard />
        ) : invoices.length === 0 ? (
          <SettingsCard title={t("tradieInvoices.title")}>
            <Text style={styles.empty}>{t("tradieMobile.emptyInvoices")}</Text>
          </SettingsCard>
        ) : (
          <SettingsCard title={t("tradieInvoices.title")}>
            {invoices.map((inv) => (
              <MobileCardRow key={inv.id} onPress={() => router.push(`/(app)/invoices/${inv.id}` as Href)}>
                <Text style={styles.title}>{`${inv.invoiceNumber} · ${inv.documentTitle}`}</Text>
                <Text style={styles.sub}>{`${inv.status} · ${t("tradieInvoices.balanceDue")}: ${formatMobileCurrency(inv.balanceDue)}`}</Text>
              </MobileCardRow>
            ))}
          </SettingsCard>
        )}
      </View>
      <ConvertJobInvoiceSheet visible={convertOpen} onClose={() => setConvertOpen(false)} />
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  title: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  sub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
