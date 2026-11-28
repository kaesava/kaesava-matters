"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export function RecordPaymentModal({
  invoiceId,
  defaultAmount,
  isOpen,
  onClose,
}: {
  invoiceId: string;
  defaultAmount: string;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [amount, setAmount] = useState(defaultAmount);
  const [method, setMethod] = useState<"BANK_TRANSFER" | "CASH" | "STRIPE_CARD" | "STRIPE_BECS">("BANK_TRANSFER");
  const [reference, setReference] = useState("");

  const payMut = trpc.invoices.recordPayment.useMutation({
    onSuccess: async () => {
      await utils.invoices.getById.invalidate({ id: invoiceId });
      await utils.invoices.list.invalidate();
      success(t("tradieWeb.paymentRecordedSuccess"));
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!(num > 0)) return;
    await payMut.mutateAsync({ invoiceId, amount: num, paymentMethod: method, reference: reference.trim() || null });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieInvoices.recordPayment")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor="rp-amt" required>{t("tradieWeb.amountLabel")}</FormLabel>
          <Input id="rp-amt" type="number" step="0.01" min="0.01" autoFocus value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <FormLabel htmlFor="rp-method">{t("tradieWeb.paymentMethodLabel")}</FormLabel>
          <GenericSelectField
            id="rp-method"
            value={method}
            onChange={(v) => setMethod(v as typeof method)}
            options={[
              { value: "BANK_TRANSFER", label: t("tradieWeb.methodBankTransfer") },
              { value: "CASH", label: t("tradieWeb.methodCash") },
              { value: "STRIPE_BECS", label: t("tradieInvoices.payByBankDirectDebit") },
              { value: "STRIPE_CARD", label: t("tradieInvoices.payByCard") },
            ]}
          />
        </div>
        <div>
          <FormLabel htmlFor="rp-ref">{t("tradieWeb.referenceLabel")}</FormLabel>
          <Input id="rp-ref" value={reference} onChange={(e) => setReference(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!(Number(amount) > 0) || payMut.isPending}>{t("tradieInvoices.recordPayment")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
