"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export function ConvertJobInvoiceModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { success } = useToast();
  const utils = trpc.useUtils();
  const jobsQuery = trpc.jobs.list.useQuery({ limit: 100 }, { enabled: isOpen });

  const [jobId, setJobId] = useState("");
  const [invoiceType, setInvoiceType] = useState<"DEPOSIT" | "PROGRESS" | "FINAL">("FINAL");
  const [sendImmediately, setSendImmediately] = useState(false);

  const convertMut = trpc.invoices.convertJob.useMutation({
    onSuccess: async (inv) => {
      await utils.invoices.list.invalidate();
      success(t("tradieWeb.invoiceCreatedSuccess"));
      onClose();
      router.push(`/dashboard/invoices/${inv.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!jobId) return;
    await convertMut.mutateAsync({ jobId, sendImmediately, allowCardPayment: true });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieInvoices.convertJobToInvoice")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor="cji-job" required>{t("tradieWeb.selectJobLabel")}</FormLabel>
          <GenericSelectField
            id="cji-job"
            value={jobId}
            onChange={setJobId}
            options={[
              { value: "", label: t("tradieWeb.selectJobLabel") },
              ...(jobsQuery.data ?? []).map((j) => ({ value: j.id, label: `${j.jobNumber} — ${j.title}` })),
            ]}
          />
        </div>
        <div>
          <FormLabel htmlFor="cji-type">{t("tradieWeb.invoiceTypeLabel")}</FormLabel>
          <GenericSelectField
            id="cji-type"
            value={invoiceType}
            onChange={(v) => setInvoiceType(v as "DEPOSIT" | "PROGRESS" | "FINAL")}
            options={[
              { value: "DEPOSIT", label: t("tradieWeb.invoiceTypeDeposit") },
              { value: "PROGRESS", label: t("tradieWeb.invoiceTypeProgress") },
              { value: "FINAL", label: t("tradieWeb.invoiceTypeFinal") },
            ]}
          />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
          <input type="checkbox" checked={sendImmediately} onChange={(e) => setSendImmediately(e.target.checked)} />
          <span>{t("tradieWeb.sendImmediatelyLabel")}</span>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!jobId || convertMut.isPending}>{t("tradieInvoices.convertJobToInvoice")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
