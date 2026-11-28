"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { AmountField, Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface PricebookItemRecord {
  id: string;
  sku: string | null;
  name: string;
  description: string | null;
  itemType: string;
  category: string | null;
  unitOfMeasure: string;
  searchAliases: string | null;
  unitCostExTax: string;
  markupPct: string;
  sellPriceExTax: string;
  taxCode: string;
  isFavourite: boolean;
  supplierName: string | null;
}

export interface PricebookItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: PricebookItemRecord | null;
}

type ItemType = "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACT";

export function PricebookItemModal({ isOpen, onClose, initial }: PricebookItemModalProps) {
  return <PricebookItemModalInner key={isOpen ? (initial?.id ?? "new") : "closed"} isOpen={isOpen} onClose={onClose} initial={initial} />;
}

function PricebookItemModalInner({ isOpen, onClose, initial }: PricebookItemModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [sku, setSku] = useState(initial?.sku ?? "");
  const [itemType, setItemType] = useState<ItemType>((initial?.itemType as ItemType) ?? "MATERIAL");
  const [unitOfMeasure, setUnitOfMeasure] = useState(initial?.unitOfMeasure ?? "EACH");
  const [unitCostExTax, setUnitCostExTax] = useState(initial?.unitCostExTax ?? "0.00");
  const [sellPriceExTax, setSellPriceExTax] = useState(initial?.sellPriceExTax ?? "0.00");
  const [supplierName, setSupplierName] = useState(initial?.supplierName ?? "");
  const [isFavourite, setIsFavourite] = useState(initial?.isFavourite ?? false);

  const createMut = trpc.pricebook.create.useMutation({ onSuccess: () => utils.pricebook.invalidate() });
  const updateMut = trpc.pricebook.update.useMutation({ onSuccess: () => utils.pricebook.invalidate() });
  const archiveMut = trpc.pricebook.archive.useMutation({ onSuccess: () => utils.pricebook.invalidate() });
  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { name: name.trim(), sku: sku.trim() || null, itemType, unitOfMeasure: unitOfMeasure.trim() || "EACH", unitCostExTax: unitCostExTax || "0.00", markupPct: initial?.markupPct ?? "0.00", sellPriceExTax: sellPriceExTax || "0.00", taxCode: "GST" as const, supplierName: supplierName.trim() || null, isFavourite };
    if (isEdit && initial) await updateMut.mutateAsync({ id: initial.id, ...payload });
    else await createMut.mutateAsync(payload);
    success(t("tradieWeb.pricebookSaved"));
    onClose();
  };

  const handleArchive = async () => {
    if (!initial) return;
    await archiveMut.mutateAsync({ id: initial.id });
    success(t("tradieWeb.pricebookArchived"));
    onClose();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={name.trim().length > 0} title={isEdit ? t("tradieWeb.editPricebookItemAction") : t("tradieCrm.addPricebookItemAction")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><FormLabel required>{t("common.name")}</FormLabel><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieCrm.skuLabel")}</FormLabel><Input value={sku} onChange={(e) => setSku(e.target.value)} /></div>
          <div><FormLabel>{t("tradieWeb.itemTypeLabel")}</FormLabel><GenericSelectField value={itemType} onChange={(v) => setItemType(v as ItemType)} options={[{ value: "MATERIAL", label: t("tradieWeb.itemTypeMaterial") }, { value: "LABOUR", label: t("tradieWeb.itemTypeLabour") }, { value: "EQUIPMENT", label: t("tradieWeb.itemTypeEquipment") }, { value: "SUBCONTRACT", label: t("tradieWeb.itemTypeSubcontract") }]} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <AmountField label={t("tradieCrm.unitCostLabel")} value={unitCostExTax} onChange={setUnitCostExTax} />
          <AmountField label={t("tradieCrm.sellPriceLabel")} value={sellPriceExTax} onChange={setSellPriceExTax} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieWeb.unitOfMeasureLabel")}</FormLabel><Input value={unitOfMeasure} onChange={(e) => setUnitOfMeasure(e.target.value)} /></div>
          <div><FormLabel>{t("tradieCrm.supplierNameLabel")}</FormLabel><Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} /></div>
        </div>
        <label className="flex items-center gap-2 text-xs font-medium text-[#1B2B4B] cursor-pointer">
          <input type="checkbox" checked={isFavourite} onChange={(e) => setIsFavourite(e.target.checked)} className="rounded border-slate-300" />
          <span>{t("tradieCrm.favouriteLabel")}</span>
        </label>
        <div className="flex items-center justify-between pt-3">
          {isEdit ? <button type="button" onClick={handleArchive} disabled={isPending} className="text-xs font-medium text-slate-400 hover:text-slate-600">{t("tradieWeb.archiveAction")}</button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!name.trim() || isPending} loading={isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
