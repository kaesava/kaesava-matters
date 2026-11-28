"use client";

import React, { useState } from "react";
import JSZip from "jszip";
import { Download } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Button, ModalDialog, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";

export function BookkeeperExportModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { success } = useToast();
  const [downloading, setDownloading] = useState(false);
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
      a.download = `tradie-accountant-pack-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      success(t("tradieWeb.exportPackDownloaded"));
      onClose();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradiePulse.accountantExport")}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500">{t("tradieWeb.accountantExportDesc")}</p>
        {packQuery.isLoading ? (
          <div className="py-6 flex justify-center"><Spinner size="md" /></div>
        ) : (
          <ul className="space-y-1.5 text-xs font-mono text-[#1B2B4B] bg-slate-50 rounded-xl p-3 border border-slate-200">
            {files.map((f) => <li key={f}>• {f}</li>)}
          </ul>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="button" disabled={packQuery.isLoading || downloading || files.length === 0} onClick={() => void handleDownloadZip()}>
            <Download className="w-4 h-4" /><span>{t("tradieWeb.downloadZipAction")}</span>
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
