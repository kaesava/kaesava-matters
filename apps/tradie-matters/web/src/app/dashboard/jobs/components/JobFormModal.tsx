"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { AmountField, Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface JobFormModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type JobPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export function JobFormModal({ isOpen, onClose }: JobFormModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [siteId, setSiteId] = useState("");
  const [priority, setPriority] = useState<JobPriority>("NORMAL");
  const [quotedAmount, setQuotedAmount] = useState("0.00");
  const [estimatedHours, setEstimatedHours] = useState("2.00");

  const customersQuery = trpc.customers.list.useQuery({ limit: 100 }, { enabled: isOpen });
  const sitesQuery = trpc.sites.list.useQuery({ limit: 100 }, { enabled: isOpen });
  const createMut = trpc.jobs.create.useMutation({ onSuccess: () => utils.jobs.list.invalidate() });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMut.mutateAsync({
      title: title.trim(),
      customerId,
      siteId: siteId || null,
      priority,
      status: "LEAD",
      quotedAmountExTax: quotedAmount || null,
      estimatedHours: estimatedHours || null,
    });
    success(t("tradieWeb.jobCreated"));
    setTitle("");
    setCustomerId("");
    setSiteId("");
    onClose();
  };

  const customerOpts = (customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }));
  const siteOpts = [{ value: "", label: t("tradieWeb.noLinkedCustomer") }, ...(sitesQuery.data ?? []).map((s) => ({ value: s.id, label: s.name }))];

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={title.trim().length > 0} title={t("tradieJobs.createJobAction")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><FormLabel required>{t("tradieJobs.jobTitleLabel")}</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel required>{t("tradieWeb.selectCustomerLabel")}</FormLabel><GenericSelectField value={customerId} onChange={setCustomerId} options={customerOpts} placeholder={t("tradieWeb.selectCustomerLabel")} /></div>
          <div><FormLabel>{t("tradieWeb.selectSiteLabel")}</FormLabel><GenericSelectField value={siteId} onChange={setSiteId} options={siteOpts} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><FormLabel>{t("tradieJobs.priorityLabel")}</FormLabel><GenericSelectField value={priority} onChange={(v) => setPriority(v as JobPriority)} options={[{ value: "LOW", label: t("tradieWeb.priorityLow") }, { value: "NORMAL", label: t("tradieWeb.priorityNormal") }, { value: "HIGH", label: t("tradieWeb.priorityHigh") }, { value: "URGENT", label: t("tradieWeb.priorityUrgent") }]} /></div>
          <AmountField label={t("tradieWeb.quotedAmountLabel")} value={quotedAmount} onChange={setQuotedAmount} />
          <div><FormLabel>{t("tradieWeb.estimatedHoursLabel")}</FormLabel><Input value={estimatedHours} onChange={(e) => setEstimatedHours(e.target.value)} /></div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!title.trim() || !customerId || createMut.isPending} loading={createMut.isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
