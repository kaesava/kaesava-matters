"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function CreatePurchaseOrderModal({ isOpen, onClose }: Props) {
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const [poNumber, setPoNumber] = useState(() => `PO-${Date.now().toString().slice(-5)}`);
  const [supplierName, setSupplierName] = useState("");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCostExTax, setUnitCostExTax] = useState("0");

  const createPoMut = trpc.suppliers.createPurchaseOrder.useMutation({
    onSuccess: async () => {
      await utils.suppliers.listPurchaseOrders.invalidate();
      success(t("tradieWeb.poCreatedSuccess"));
      onClose();
    },
    onError: (err) => showError(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPoMut.mutate({
      poNumber: poNumber.trim(),
      supplierName: supplierName.trim(),
      supplierEmail: supplierEmail.trim() || null,
      lines: [
        {
          description: description.trim(),
          quantity: Math.max(1, Number(quantity) || 1),
          unitCostExTax: Math.max(0, Number(unitCostExTax) || 0),
        },
      ],
    });
  };

  const canSubmit = Boolean(poNumber.trim() && supplierName.trim() && description.trim());

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieWeb.createPoAction")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <FormLabel>{t("tradieWeb.poNumberLabel")}</FormLabel>
            <input required value={poNumber} onChange={(e) => setPoNumber(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" />
          </div>
          <div>
            <FormLabel>{t("tradieWeb.supplierNameLabel")}</FormLabel>
            <input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
        </div>
        <div>
          <FormLabel>{t("tradieWeb.supplierEmailLabel")}</FormLabel>
          <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </div>
        <div>
          <FormLabel>{t("tradieWeb.poDescriptionLabel")}</FormLabel>
          <input required value={description} onChange={(e) => setDescription(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <FormLabel>{t("tradieWeb.poQuantityLabel")}</FormLabel>
            <input type="number" min="1" step="1" required value={quantity} onChange={(e) => setQuantity(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" />
          </div>
          <div>
            <FormLabel>{t("tradieWeb.poUnitCostLabel")}</FormLabel>
            <input type="number" min="0" step="0.01" required value={unitCostExTax} onChange={(e) => setUnitCostExTax(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={createPoMut.isPending} disabled={!canSubmit}>{t("tradieWeb.createPoAction")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
