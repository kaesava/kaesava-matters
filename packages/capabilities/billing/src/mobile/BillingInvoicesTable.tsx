import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileBadge, MobileLinkButton, SettingsCard, fmtDate, useAppTheme } from "@kaesava/ui/mobile";

export interface BillingInvoiceItem {
  id: string;
  date: string | Date;
  amountFormatted: string;
  status: string;
  invoiceUrl?: string | null;
  pdfUrl?: string | null;
}

export interface BillingInvoicesTableProps {
  invoices: BillingInvoiceItem[];
  isLoading?: boolean;
  onOpenInvoice: (url: string) => void;
}

export function BillingInvoicesTable({ invoices, isLoading, onOpenInvoice }: BillingInvoicesTableProps) {
  const { colors } = useAppTheme();
  if (isLoading) return null;

  return (
    <SettingsCard title={t("subscription.invoiceHistoryTitle")}>
      {invoices.length === 0 ? (
        <Text style={[styles.empty, { color: colors.textMuted }]}>{t("subscription.noInvoices")}</Text>
      ) : (
        <View style={styles.list}>
          {invoices.map((inv) => {
            const isPaid = inv.status.toLowerCase() === "paid";
            const link = inv.pdfUrl || inv.invoiceUrl;
            return (
              <View key={inv.id} style={[styles.row, { borderBottomColor: colors.border }]}>
                <View style={styles.rowTop}>
                  <Text style={[styles.dateText, { color: colors.textPrimary }]}>{fmtDate(inv.date)}</Text>
                  <MobileBadge variant={isPaid ? "success" : "warning"}>
                    {isPaid ? t("subscription.statusPaid") : t("subscription.statusOpen")}
                  </MobileBadge>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={[styles.amountText, { color: colors.textPrimary }]}>{inv.amountFormatted}</Text>
                  {link && (
                    <MobileLinkButton
                      label={isPaid ? t("subscription.downloadReceipt") : t("subscription.payInvoice")}
                      onPress={() => onOpenInvoice(link)}
                    />
                  )}
                </View>
              </View>
            );
          })}
        </View>
      )}
    </SettingsCard>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 13 },
  list: { gap: 10 },
  row: { paddingBottom: 10, borderBottomWidth: 1, gap: 6 },
  rowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dateText: { fontSize: 13, fontWeight: "600" },
  amountText: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
});
