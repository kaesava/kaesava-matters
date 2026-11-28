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
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface MobileRecordPaymentSheetProps {
  visible: boolean;
  invoiceId: string;
  defaultAmount: string;
  onClose: () => void;
}

type PayMethod = "BANK_TRANSFER" | "CASH" | "STRIPE_CARD" | "STRIPE_BECS";

export function MobileRecordPaymentSheet({ visible, invoiceId, defaultAmount, onClose }: MobileRecordPaymentSheetProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<PayMethod>("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  const recordMut = trpc.invoices.recordPayment.useMutation({
    onSuccess: () => {
      void utils.invoices.invalidate();
      void utils.activity.invalidate();
      toast.success(t("tradieMobile.paymentRecordedToast"));
      setReference("");
      onClose();
    },
  });

  const parsed = Number(amount);

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieInvoices.recordPayment")}
      isDirty={Boolean(reference.trim())}
      footer={
        <MobileButton
          title={t("tradieInvoices.recordPayment")}
          loading={recordMut.isPending}
          disabled={!parsed || parsed <= 0 || recordMut.isPending}
          onPress={() =>
            recordMut.mutate({
              invoiceId,
              amount: parsed,
              paymentMethod: method,
              reference: reference.trim() || null,
            })
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileAmountInput label={t("common.amount")} value={amount} onChangeText={setAmount} />
        <MobileFormLabel label={t("tradieMobile.paymentMethodLabel")} />
        <ChipSelect
          value={method}
          onChange={(v) => setMethod(v as PayMethod)}
          options={[
            { label: t("tradieMobile.paymentMethodBank"), value: "BANK_TRANSFER" },
            { label: t("tradieMobile.paymentMethodCash"), value: "CASH" },
            { label: t("tradieMobile.paymentMethodCard"), value: "STRIPE_CARD" },
            { label: t("tradieMobile.paymentMethodBecs"), value: "STRIPE_BECS" },
          ]}
        />
        <MobileInput label={t("tradieMobile.paymentReferenceLabel")} value={reference} onChangeText={setReference} />
      </View>
    </MobileModalDialog>
  );
}
