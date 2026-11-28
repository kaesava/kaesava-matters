import React, { useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  MobileAmountInput,
  MobileButton,
  MobileFormLabel,
  MobileInput,
  MobileModalDialog,
  SwitchRow,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface MobileCreditNoteSheetProps {
  visible: boolean;
  invoiceId: string;
  onClose: () => void;
}

export function MobileCreditNoteSheet({ visible, invoiceId, onClose }: MobileCreditNoteSheetProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const [amountExTax, setAmountExTax] = useState("0.00");
  const [includeGst, setIncludeGst] = useState(true);
  const [destination, setDestination] = useState<"INVOICE_BALANCE" | "CUSTOMER_CREDIT">("INVOICE_BALANCE");

  const creditMut = trpc.invoices.issueCreditNote.useMutation({
    onSuccess: () => {
      void utils.invoices.invalidate();
      void utils.activity.invalidate();
      toast.success(t("tradieMobile.creditNoteIssuedToast"));
      setReason("");
      setAmountExTax("0.00");
      onClose();
    },
  });

  const parsed = Number(amountExTax);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieInvoices.issueCreditNote")}
      isDirty={Boolean(reason.trim())}
      footer={
        <MobileButton
          title={t("tradieInvoices.issueCreditNote")}
          loading={creditMut.isPending}
          disabled={!reason.trim() || !parsed || parsed <= 0 || creditMut.isPending}
          onPress={() =>
            creditMut.mutate({
              invoiceId,
              reason: reason.trim(),
              amountExTax: parsed,
              includeGst,
              creditDestination: destination,
            })
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieMobile.creditReasonLabel")} value={reason} onChangeText={setReason} />
        <MobileAmountInput label={t("common.amount")} value={amountExTax} onChangeText={setAmountExTax} />
        <SwitchRow label={t("tradieMobile.includeGstLabel")} value={includeGst} onValueChange={setIncludeGst} />
        <MobileFormLabel label={t("tradieMobile.creditDestinationLabel")} />
        <ChipSelect
          value={destination}
          onChange={(v) => setDestination(v as "INVOICE_BALANCE" | "CUSTOMER_CREDIT")}
          options={[
            { label: t("tradieMobile.creditDestInvoice"), value: "INVOICE_BALANCE" },
            { label: t("tradieMobile.creditDestCustomer"), value: "CUSTOMER_CREDIT" },
          ]}
        />
      </View>
    </MobileModalDialog>
  );
}
