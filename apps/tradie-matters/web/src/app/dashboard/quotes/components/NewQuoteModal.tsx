"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export function NewQuoteModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const { success } = useToast();
  const utils = trpc.useUtils();
  const customersQuery = trpc.customers.list.useQuery({ limit: 100 }, { enabled: isOpen });
  const jobsQuery = trpc.jobs.list.useQuery({ limit: 100 }, { enabled: isOpen });

  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [jobId, setJobId] = useState("");
  const [firstItemDesc, setFirstItemDesc] = useState("");
  const [firstItemPrice, setFirstItemPrice] = useState("0");

  const createMut = trpc.quotes.create.useMutation({
    onSuccess: async (created) => {
      await utils.quotes.list.invalidate();
      success(t("tradieWeb.quoteCreated"));
      onClose();
      router.push(`/dashboard/quotes/${created.id}`);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !customerId || !firstItemDesc.trim()) return;
    await createMut.mutateAsync({
      title: title.trim(),
      customerId,
      jobId: jobId || null,
      gstMode: "EXCLUSIVE",
      depositType: "NONE",
      depositValue: 0,
      optionGroups: [],
      lines: [
        {
          description: firstItemDesc.trim(),
          quantity: 1,
          unitCostExTax: 0,
          unitSellPrice: Number(firstItemPrice) || 0,
          taxCode: "GST",
          sortOrder: 0,
        },
      ],
    });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieQuotes.newQuote")}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FormLabel htmlFor="nq-title" required>{t("tradieWeb.quoteTitleLabel")}</FormLabel>
          <Input id="nq-title" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <FormLabel htmlFor="nq-customer" required>{t("tradieWeb.selectCustomerLabel")}</FormLabel>
          <GenericSelectField
            id="nq-customer"
            value={customerId}
            onChange={setCustomerId}
            options={[
              { value: "", label: t("tradieWeb.selectCustomerLabel") },
              ...(customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
        <div>
          <FormLabel htmlFor="nq-job">{t("tradieWeb.selectJobOptionalLabel")}</FormLabel>
          <GenericSelectField
            id="nq-job"
            value={jobId}
            onChange={setJobId}
            options={[
              { value: "", label: t("tradieWeb.noLinkedJob") },
              ...(jobsQuery.data ?? []).map((j) => ({ value: j.id, label: `${j.jobNumber} — ${j.title}` })),
            ]}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <FormLabel htmlFor="nq-desc" required>{t("tradieWeb.lineDescriptionLabel")}</FormLabel>
            <Input id="nq-desc" value={firstItemDesc} onChange={(e) => setFirstItemDesc(e.target.value)} required />
          </div>
          <div>
            <FormLabel htmlFor="nq-price">{t("tradieWeb.unitPriceLabel")}</FormLabel>
            <Input id="nq-price" type="number" step="0.01" min="0" value={firstItemPrice} onChange={(e) => setFirstItemPrice(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={!title.trim() || !customerId || !firstItemDesc.trim() || createMut.isPending}>
            {t("tradieQuotes.newQuote")}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
