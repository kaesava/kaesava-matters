"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export function ReceiptOcrModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const fileId = useId();
  const [supplierName, setSupplierName] = useState("");
  const [supplierAbn, setSupplierAbn] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [subtotalExTax, setSubtotalExTax] = useState("0");
  const [taxAmount, setTaxAmount] = useState("0");
  const [totalIncTax, setTotalIncTax] = useState("0");

  const extractMut = trpc.suppliers.extractReceipt.useMutation({
    onSuccess: (res) => {
      setSupplierName(res.supplierName);
      setSupplierAbn(res.supplierAbn ?? "");
      setIssueDate(res.issueDate);
      setSubtotalExTax(String(res.subtotalExTax));
      setTaxAmount(String(res.taxAmount));
      setTotalIncTax(String(res.totalIncTax));
    },
    onError: (err) => showError(err.message),
  });

  const createBillMut = trpc.suppliers.createBill.useMutation({
    onSuccess: async () => { await utils.suppliers.listBills.invalidate(); success(t("tradieWeb.billSavedSuccess")); onClose(); },
    onError: (err) => showError(err.message),
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] ?? "" : result;
      if (base64) extractMut.mutate({ imageBase64: base64, mimeType: file.type || "image/jpeg" });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createBillMut.mutate({
      supplierName: supplierName.trim(),
      supplierAbn: supplierAbn.trim() || null,
      issueDate,
      subtotalExTax: Number(subtotalExTax) || 0,
      taxAmount: Number(taxAmount) || 0,
      totalIncTax: Number(totalIncTax) || 0,
      source: "OCR",
    });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieWeb.receiptUploadTitle")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor={fileId}>{t("tradieWeb.receiptFileLabel")}</FormLabel>
          <input id={fileId} type="file" accept="image/*" onChange={handleFileChange} className="block w-full text-xs text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:font-semibold" />
          {extractMut.isPending && <p className="mt-1 text-xs text-[#2563eb]">{t("tradieWeb.extractingReceipt")}</p>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieWeb.supplierNameLabel")}</FormLabel><input required value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></div>
          <div><FormLabel>{t("tradieWeb.supplierAbnLabel")}</FormLabel><input value={supplierAbn} onChange={(e) => setSupplierAbn(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" /></div>
          <div><FormLabel>{t("tradieWeb.issueDateLabel")}</FormLabel><input type="date" required value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></div>
          <div><FormLabel>{t("tradieWeb.subtotalExTaxLabel")}</FormLabel><input type="number" step="0.01" required value={subtotalExTax} onChange={(e) => setSubtotalExTax(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" /></div>
          <div><FormLabel>{t("tradieWeb.taxAmountLabel")}</FormLabel><input type="number" step="0.01" required value={taxAmount} onChange={(e) => setTaxAmount(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" /></div>
          <div><FormLabel>{t("tradieWeb.totalIncTaxLabel")}</FormLabel><input type="number" step="0.01" required value={totalIncTax} onChange={(e) => setTotalIncTax(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" loading={createBillMut.isPending} disabled={!supplierName.trim()}>{t("tradieWeb.confirmSaveBillAction")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
