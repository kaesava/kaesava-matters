"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { Download, FileText } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Button, DatePickerField, ModalDialog, Spinner, fmtDateIso, useDateLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";

export function BookkeeperExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { success } = useToast();
  const { timeZone } = useDateLocale();
  const [downloading, setDownloading] = useState(false);
  const [fromDate, setFromDate] = useState(() => fmtDateIso(new Date(Date.now() - 30 * 86400_000), timeZone));
  const [toDate, setToDate] = useState(() => fmtDateIso(new Date(), timeZone));
  const packQuery = trpc.pulse.exportAccountantPack.useQuery(undefined, { enabled: isOpen });
  const files = packQuery.data ? Object.keys(packQuery.data) : [];

  const handleDownloadZip = async () => {
    if (!packQuery.data) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      for (const [name, csv] of Object.entries(packQuery.data)) {
        zip.file(name, csv);
      }
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tradie-accountant-pack-${fromDate}-to-${toDate}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      success(t("tradieWeb.exportPackDownloaded"));
      onClose();
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPdfSummary = () => {
    window.print();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradiePulse.accountantExport")}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">{t("tradieWeb.accountantExportDesc")}</p>
        <div className="grid grid-cols-2 gap-3">
          <DatePickerField label={t("tradieWeb.fromDateLabel")} value={fromDate} onChange={setFromDate} />
          <DatePickerField label={t("tradieWeb.toDateLabel")} value={toDate} onChange={setToDate} />
        </div>
        {packQuery.isLoading ? (
          <div className="py-6 flex justify-center"><Spinner size="md" /></div>
        ) : (
          <ul className="space-y-1.5 text-xs font-mono text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 border border-slate-200 dark:border-slate-700">
            {files.map((f) => <li key={f}>• {f}</li>)}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="button" variant="secondary" onClick={handleDownloadPdfSummary}>
            <FileText className="w-4 h-4" /><span>{t("tradieWeb.downloadPdfSummary")}</span>
          </Button>
          <Button type="button" disabled={packQuery.isLoading || downloading || files.length === 0} onClick={() => void handleDownloadZip()}>
            <Download className="w-4 h-4" /><span>{t("tradieWeb.downloadZipAction")}</span>
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
