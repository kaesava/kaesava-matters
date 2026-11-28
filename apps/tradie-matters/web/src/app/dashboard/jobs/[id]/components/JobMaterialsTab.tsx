"use client";

import React, { useState } from "react";
import { Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { AmountField, Badge, Button, formatCurrency, FormLabel, GenericSelectField, Input, ModalDialog, useCurrencyLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export interface JobMaterialItem {
  id: string;
  description: string;
  quantity: string;
  unitSellPriceExTax: string;
  isBillable: boolean;
}

export function JobMaterialsTab({ jobId, materials }: { jobId: string; materials: readonly JobMaterialItem[] }) {
  const { success } = useToast();
  const { currency, locale } = useCurrencyLocale();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [pricebookItemId, setPricebookItemId] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1.00");
  const [unitPrice, setUnitPrice] = useState("0.00");

  const pricebookQuery = trpc.pricebook.list.useQuery(undefined, { enabled: open });
  const logMut = trpc.field.logMaterialUsage.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });

  const handlePickPricebook = (id: string) => {
    setPricebookItemId(id);
    const found = pricebookQuery.data?.find((i) => i.id === id);
    if (found) {
      setDescription(found.name);
      setUnitPrice(found.sellPriceExTax);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await logMut.mutateAsync({ jobId, pricebookItemId: pricebookItemId || null, description: description.trim(), quantity: quantity || "1.00", unitSellPriceExTax: unitPrice || "0.00", taxCode: "GST", isBillable: true });
    success(t("tradieWeb.materialLogged"));
    setDescription("");
    setPricebookItemId("");
    setOpen(false);
  };

  const pbOpts = [{ value: "", label: t("tradieWeb.noLinkedCustomer") }, ...(pricebookQuery.data ?? []).map((i) => ({ value: i.id, label: `${i.name} (${formatCurrency(Number(i.sellPriceExTax), currency, locale)})` }))];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieJobs.materialsTitle")}</h2>
        <Button type="button" size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /><span>{t("tradieJobs.logMaterialAction")}</span></Button>
      </div>
      {materials.length === 0 ? (
        <div className="ui-card text-center py-8 text-xs text-slate-500">{t("tradieWeb.noMaterialsEmpty")}</div>
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="ui-card flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-[#1B2B4B]">{m.description}</div>
                <div className="text-xs font-mono text-slate-500">{m.quantity} × {formatCurrency(Number(m.unitSellPriceExTax), currency, locale)}</div>
              </div>
              <Badge variant={m.isBillable ? "success" : "warning"}>{m.isBillable ? t("tradieWeb.billableBadge") : t("tradieWeb.nonBillableBadge")}</Badge>
            </div>
          ))}
        </div>
      )}
      <ModalDialog isOpen={open} onClose={() => setOpen(false)} isDirty={description.trim().length > 0} title={t("tradieJobs.logMaterialAction")}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><FormLabel>{t("tradieWeb.materialPricebookPickLabel")}</FormLabel><GenericSelectField value={pricebookItemId} onChange={handlePickPricebook} options={pbOpts} /></div>
          <div><FormLabel required>{t("tradieWeb.materialDescLabel")}</FormLabel><Input value={description} onChange={(e) => setDescription(e.target.value)} required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><FormLabel>{t("tradieWeb.materialQtyLabel")}</FormLabel><Input value={quantity} onChange={(e) => setQuantity(e.target.value)} /></div>
            <AmountField label={t("tradieWeb.materialUnitPriceLabel")} value={unitPrice} onChange={setUnitPrice} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!description.trim() || logMut.isPending} loading={logMut.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
