"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export function RefundPaymentModal({
  invoiceId,
  payments,
  isOpen,
  onClose,
}: {
  invoiceId: string;
  payments: Array<{ id: string; amount: string; paymentMethod: string }>;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [paymentId, setPaymentId] = useState(payments[0]?.id ?? "");
  const [amount, setAmount] = useState(payments[0]?.amount ?? "");
  const [reason, setReason] = useState("");

  const refundMut = trpc.invoices.refundPayment.useMutation({
    onSuccess: async () => {
      await utils.invoices.getById.invalidate({ id: invoiceId });
      success(t("tradieWeb.refundIssuedSuccess"));
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amount);
    if (!paymentId || !(num > 0)) return;
    await refundMut.mutateAsync({ paymentId, amount: num, refundMethod: "MANUAL", reason: reason.trim() || null });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieInvoices.refundPayment")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor="rf-pay" required>{t("tradieWeb.selectPaymentLabel")}</FormLabel>
          <GenericSelectField
            id="rf-pay"
            value={paymentId}
            onChange={setPaymentId}
            options={payments.map((p) => ({ value: p.id, label: `${p.paymentMethod} — $${p.amount}` }))}
          />
        </div>
        <div>
          <FormLabel htmlFor="rf-amt" required>{t("tradieWeb.amountLabel")}</FormLabel>
          <Input id="rf-amt" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <FormLabel htmlFor="rf-reason">{t("tradieWeb.reasonLabel")}</FormLabel>
          <Input id="rf-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!paymentId || !(Number(amount) > 0) || refundMut.isPending}>{t("tradieInvoices.refundPayment")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
