"use client";

import React, { useState } from "react";
import { CheckCircle2, Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { AmountField, Badge, Button, formatCurrency, FormLabel, Input, ModalDialog, SignaturePad, useCurrencyLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export interface JobVariationItem {
  id: string;
  variationNumber: string;
  title: string;
  status: string;
  totalSellExTax: string;
  approvedByName: string | null;
}

export function JobVariationsTab({ jobId, variations }: { jobId: string; variations: readonly JobVariationItem[] }) {
  const { success } = useToast();
  const { currency, locale } = useCurrencyLocale();
  const utils = trpc.useUtils();
  const [createOpen, setCreateOpen] = useState(false);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [unitPrice, setUnitPrice] = useState("150.00");
  const [approverName, setApproverName] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);

  const createMut = trpc.field.createVariation.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });
  const approveMut = trpc.field.approveVariation.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({ jobId, title: title.trim(), lines: [{ description: lineDesc.trim(), quantity: "1.00", unitCostExTax: "0.00", unitSellPriceExTax: unitPrice || "0.00", taxCode: "GST", sortOrder: 0 }] });
    success(t("tradieWeb.variationCreated"));
    setTitle("");
    setLineDesc("");
    setCreateOpen(false);
  };

  const handleApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approveId || !signatureDataUrl) return;
    await approveMut.mutateAsync({ variationId: approveId, approvedByName: approverName.trim() });
    success(t("tradieWeb.variationApproved"));
    setApproveId(null);
    setApproverName("");
    setSignatureDataUrl(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieJobs.variationsTitle")}</h2>
        <Button type="button" size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /><span>{t("tradieJobs.createVariationAction")}</span></Button>
      </div>
      {variations.length === 0 ? (
        <div className="ui-card text-center py-8 text-xs text-slate-500">{t("tradieWeb.noVariationsEmpty")}</div>
      ) : (
        <div className="space-y-2">
          {variations.map((v) => (
            <div key={v.id} className="ui-card flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold text-sm text-[#1B2B4B]">{v.variationNumber} — {v.title}</div>
                {v.approvedByName && <div className="text-xs text-slate-500">{v.approvedByName}</div>}
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-[#1B2B4B]">{formatCurrency(Number(v.totalSellExTax), currency, locale)}</span>
                <Badge variant={v.status === "APPROVED" ? "success" : "warning"}>{v.status === "APPROVED" ? t("tradieWeb.approvedBadge") : t("tradieWeb.pendingBadge")}</Badge>
                {v.status !== "APPROVED" && (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setApproveId(v.id)}><CheckCircle2 className="w-3.5 h-3.5" /><span>{t("tradieJobs.approveVariationAction")}</span></Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <ModalDialog isOpen={createOpen} onClose={() => setCreateOpen(false)} isDirty={title.trim().length > 0} title={t("tradieJobs.createVariationAction")}>
        <form onSubmit={handleCreate} className="space-y-3">
          <div><FormLabel required>{t("tradieWeb.variationTitleLabel")}</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required /></div>
          <div><FormLabel required>{t("tradieWeb.variationLineDescLabel")}</FormLabel><Input value={lineDesc} onChange={(e) => setLineDesc(e.target.value)} required /></div>
          <AmountField label={t("tradieWeb.variationUnitPriceLabel")} value={unitPrice} onChange={setUnitPrice} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!title.trim() || !lineDesc.trim() || createMut.isPending} loading={createMut.isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </ModalDialog>
      <ModalDialog isOpen={Boolean(approveId)} onClose={() => setApproveId(null)} isDirty={Boolean(signatureDataUrl)} title={t("tradieJobs.approveVariationAction")}>
        <form onSubmit={handleApprove} className="space-y-3">
          <div><FormLabel required>{t("tradieWeb.approvedByNameLabel")}</FormLabel><Input value={approverName} onChange={(e) => setApproverName(e.target.value)} autoFocus required /></div>
          <div><FormLabel required>{t("tradieWeb.customerSignatureLabel")}</FormLabel><SignaturePad onChange={setSignatureDataUrl} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setApproveId(null)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!approverName.trim() || !signatureDataUrl || approveMut.isPending} loading={approveMut.isPending}>{t("tradieJobs.approveVariationAction")}</Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
