"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../lib/trpc";

export interface CsvImportWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "pricebook" | "customers";
}

type CsvSource = "XERO" | "TRADIFY" | "SERVICEM8" | "FERGUS";

const SOURCE_OPTIONS: Array<{ value: CsvSource; label: string }> = [
  { value: "XERO", label: "Xero" },
  { value: "TRADIFY", label: "Tradify" },
  { value: "SERVICEM8", label: "ServiceM8" },
  { value: "FERGUS", label: "Fergus" },
];

export function CsvImportWizardModal({ isOpen, onClose, mode }: CsvImportWizardModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [source, setSource] = useState<CsvSource>("XERO");
  const [csvText, setCsvText] = useState("");
  const importPricebook = trpc.pricebook.importCsv.useMutation();
  const createCustomer = trpc.customers.create.useMutation();

  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rowCount = Math.max(0, lines.length - 1);
  const isPending = importPricebook.isPending || createCustomer.isPending;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvText(await file.text());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    if (mode === "pricebook") {
      const res = await importPricebook.mutateAsync({ source, csvText });
      await utils.pricebook.invalidate();
      success(t("tradieWeb.csvImportSuccess", { count: String(res.importedCount) }));
    } else {
      let count = 0;
      for (const row of lines.slice(1)) {
        const [name, email, phone, mobile, companyName] = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (!name) continue;
        await createCustomer.mutateAsync({ name, email: email || null, phone: phone || null, mobile: mobile || null, companyName: companyName || null, customerType: "RESIDENTIAL" });
        count += 1;
      }
      await utils.customers.list.invalidate();
      success(t("tradieWeb.csvImportSuccess", { count: String(count) }));
    }
    setCsvText("");
    onClose();
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      isDirty={csvText.trim().length > 0}
      title={mode === "pricebook" ? t("tradieCrm.importCsvAction") : t("tradieWeb.importCustomersCsvAction")}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "pricebook" && (
          <div>
            <FormLabel>{t("tradieWeb.csvSourceLabel")}</FormLabel>
            <GenericSelectField value={source} onChange={(v) => setSource(v as CsvSource)} options={SOURCE_OPTIONS} />
          </div>
        )}
        <div>
          <FormLabel>{t("tradieWeb.csvUploadLabel")}</FormLabel>
          <input type="file" accept=".csv,text/csv" onChange={handleFile} className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-[#2563eb] file:font-semibold" />
        </div>
        <div>
          <FormLabel>{t("tradieWeb.csvPasteLabel")}</FormLabel>
          <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={6} placeholder={t("tradieWeb.csvPastePlaceholder")} className="w-full rounded-lg border border-slate-200 p-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#2563eb]" />
          {rowCount > 0 && <p className="mt-1 text-xs text-slate-500">{t("tradieWeb.csvPreviewRows", { count: String(rowCount) })}</p>}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!csvText.trim() || isPending} loading={isPending}>{t("tradieWeb.csvImportAction")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
