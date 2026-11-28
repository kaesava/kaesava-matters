import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileSkeletonCard,
  ReadOnlyField,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { TradieWorkspaceShell } from "../../../components/TradieWorkspaceShell";
import { MobileCreditNoteSheet } from "../../../components/invoices/MobileCreditNoteSheet";
import { MobilePayIdShowCard } from "../../../components/invoices/MobilePayIdShowCard";
import { MobileRecordPaymentSheet } from "../../../components/invoices/MobileRecordPaymentSheet";
import { formatMobileCurrency } from "../../../lib/format";
import { trpc } from "../../../lib/trpc";

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [payOpen, setPayOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);

  const detailQuery = trpc.invoices.getById.useQuery({ id: id ?? "" }, { enabled: Boolean(id) });
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const sendMut = trpc.invoices.send.useMutation({
    onSuccess: () => {
      void utils.invoices.invalidate();
      toast.success(t("tradieMobile.invoiceSentToast"));
    },
  });

  const data = detailQuery.data;

  return (
    <TradieWorkspaceShell
      title={data ? `${data.invoice.invoiceNumber} · ${data.invoice.documentTitle}` : t("tradieInvoices.title")}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
        {detailQuery.isLoading || !data ? (
          <MobileSkeletonCard />
        ) : (
          <>
            <SettingsCard title={data.invoice.documentTitle}>
              <ReadOnlyField label={t("common.status")} value={data.invoice.status} />
              <ReadOnlyField label={t("tradieInvoices.balanceDue")} value={formatMobileCurrency(data.invoice.balanceDue)} />
              <ReadOnlyField label={t("tradieInvoices.amountPaid")} value={formatMobileCurrency(data.invoice.amountPaid)} />
              {!data.invoice.gstRegisteredSnapshot ? <Text style={styles.note}>{t("tradieInvoices.noGstCharged")}</Text> : null}
              {data.invoice.status === "DRAFT" ? (
                <MobileButton title={t("tradieInvoices.sendInvoice")} loading={sendMut.isPending} onPress={() => sendMut.mutate({ id: data.invoice.id })} />
              ) : null}
              <MobileButton title={t("tradieInvoices.recordPayment")} onPress={() => setPayOpen(true)} />
              <MobileButton title={t("tradieInvoices.issueCreditNote")} variant="secondary" onPress={() => setCreditOpen(true)} />
            </SettingsCard>
            <MobilePayIdShowCard
              profile={profileQuery.data}
              invoiceNumber={data.invoice.invoiceNumber}
              balanceDue={formatMobileCurrency(data.invoice.balanceDue)}
            />
            <SettingsCard title={t("tradieMobile.quoteLinesTitle")}>
              {data.lines.map((line) => (
                <ReadOnlyField key={line.id} label={`${line.description} (${line.quantity})`} value={formatMobileCurrency(line.lineTotalIncTax)} />
              ))}
            </SettingsCard>
          </>
        )}
      </View>
      {data ? (
        <>
          <MobileRecordPaymentSheet visible={payOpen} invoiceId={data.invoice.id} defaultAmount={data.invoice.balanceDue} onClose={() => setPayOpen(false)} />
          <MobileCreditNoteSheet visible={creditOpen} invoiceId={data.invoice.id} onClose={() => setCreditOpen(false)} />
        </>
      ) : null}
    </TradieWorkspaceShell>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 32 },
  note: { fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
});
