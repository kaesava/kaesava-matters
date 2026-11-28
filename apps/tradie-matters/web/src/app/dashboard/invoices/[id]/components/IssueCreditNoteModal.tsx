"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export function IssueCreditNoteModal({
  invoiceId,
  gstRegistered,
  isOpen,
  onClose,
}: {
  invoiceId: string;
  gstRegistered: boolean;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [reason, setReason] = useState("");
  const [amountExTax, setAmountExTax] = useState("");
  const [destination, setDestination] = useState<"INVOICE_BALANCE" | "CUSTOMER_CREDIT">("INVOICE_BALANCE");

  const creditMut = trpc.invoices.issueCreditNote.useMutation({
    onSuccess: async () => {
      await utils.invoices.getById.invalidate({ id: invoiceId });
      await utils.invoices.list.invalidate();
      success(t("tradieWeb.creditNoteIssuedSuccess"));
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(amountExTax);
    if (!reason.trim() || !(num > 0)) return;
    await creditMut.mutateAsync({ invoiceId, reason: reason.trim(), amountExTax: num, includeGst: gstRegistered, creditDestination: destination });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieInvoices.issueCreditNote")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor="cn-reason" required>{t("tradieWeb.reasonLabel")}</FormLabel>
          <Input id="cn-reason" autoFocus value={reason} onChange={(e) => setReason(e.target.value)} required />
        </div>
        <div>
          <FormLabel htmlFor="cn-amt" required>{t("tradieWeb.amountExTaxLabel")}</FormLabel>
          <Input id="cn-amt" type="number" step="0.01" min="0.01" value={amountExTax} onChange={(e) => setAmountExTax(e.target.value)} required />
        </div>
        <div>
          <FormLabel htmlFor="cn-dest">{t("tradieWeb.creditDestinationLabel")}</FormLabel>
          <GenericSelectField
            id="cn-dest"
            value={destination}
            onChange={(v) => setDestination(v as typeof destination)}
            options={[
              { value: "INVOICE_BALANCE", label: t("tradieWeb.creditToInvoice") },
              { value: "CUSTOMER_CREDIT", label: t("tradieWeb.creditToCustomer") },
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!reason.trim() || !(Number(amountExTax) > 0) || creditMut.isPending}>{t("tradieInvoices.issueCreditNote")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
