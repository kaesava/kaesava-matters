"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface CustomerRecord {
  id: string;
  name: string;
  companyName: string | null;
  customerType: string;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  abn: string | null;
  billingAddress: string | null;
  paymentTermsDays: number | null;
  notes: string | null;
}

export interface CustomerFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: CustomerRecord | null;
}

type CustomerType = "RESIDENTIAL" | "COMMERCIAL" | "STRATA" | "REAL_ESTATE";

export function CustomerFormModal({ isOpen, onClose, initial }: CustomerFormModalProps) {
  return <CustomerFormModalInner key={isOpen ? (initial?.id ?? "new") : "closed"} isOpen={isOpen} onClose={onClose} initial={initial} />;
}

function CustomerFormModalInner({ isOpen, onClose, initial }: CustomerFormModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [companyName, setCompanyName] = useState(initial?.companyName ?? "");
  const [customerType, setCustomerType] = useState<CustomerType>((initial?.customerType as CustomerType) ?? "RESIDENTIAL");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [abn] = useState(initial?.abn ?? "");
  const [paymentTermsDays] = useState(String(initial?.paymentTermsDays ?? 14));
  const [notes] = useState(initial?.notes ?? "");
  const [billingAddress, setBillingAddress] = useState(initial?.billingAddress ?? "");

  const createMut = trpc.customers.create.useMutation({ onSuccess: () => utils.customers.list.invalidate() });
  const updateMut = trpc.customers.update.useMutation({ onSuccess: () => utils.customers.invalidate() });
  const archiveMut = trpc.customers.archive.useMutation({ onSuccess: () => utils.customers.list.invalidate() });
  const isDirty = name !== (initial?.name ?? "") || email !== (initial?.email ?? "") || phone !== (initial?.phone ?? "") || mobile !== (initial?.mobile ?? "") || abn !== (initial?.abn ?? "") || paymentTermsDays !== String(initial?.paymentTermsDays ?? 14) || notes !== (initial?.notes ?? "") || companyName !== (initial?.companyName ?? "") || billingAddress !== (initial?.billingAddress ?? "");
  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: name.trim(),
      companyName: companyName.trim() || null,
      customerType,
      email: email.trim() || null,
      phone: phone.trim() || null,
      mobile: mobile.trim() || null,
      abn: abn.trim() || null,
      paymentTermsDays: paymentTermsDays ? Number(paymentTermsDays) : 14,
      notes: notes.trim() || null,
      billingAddress: billingAddress.trim() || null,
    };
    if (isEdit && initial) await updateMut.mutateAsync({ id: initial.id, ...payload });
    else await createMut.mutateAsync(payload);
    success(t("tradieWeb.customerSaved"));
    onClose();
  };

  const handleArchive = async () => {
    if (!initial) return;
    await archiveMut.mutateAsync({ id: initial.id });
    success(t("tradieWeb.customerArchived"));
    onClose();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={isDirty} title={isEdit ? t("tradieCrm.editCustomerAction") : t("tradieCrm.addCustomerAction")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><FormLabel required>{t("tradieCrm.customerNameLabel")}</FormLabel><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieCrm.companyNameLabel")}</FormLabel><Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} /></div>
          <div><FormLabel>{t("tradieCrm.customerTypeLabel")}</FormLabel><GenericSelectField value={customerType} onChange={(v) => setCustomerType(v as CustomerType)} options={[{ value: "RESIDENTIAL", label: t("tradieWeb.customerTypeResidential") }, { value: "COMMERCIAL", label: t("tradieWeb.customerTypeCommercial") }, { value: "STRATA", label: t("tradieWeb.customerTypeStrata") }, { value: "REAL_ESTATE", label: t("tradieWeb.customerTypeRealEstate") }]} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieCrm.emailLabel")}</FormLabel><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div><FormLabel>{t("tradieCrm.mobileLabel")}</FormLabel><Input value={mobile} onChange={(e) => setMobile(e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieCrm.phoneLabel")}</FormLabel><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div><FormLabel>{t("tradieCrm.billingAddressLabel")}</FormLabel><Input value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between pt-3">
          {isEdit ? <button type="button" onClick={handleArchive} disabled={isPending} className="text-xs font-medium text-slate-400 hover:text-slate-600">{t("tradieWeb.archiveAction")}</button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!name.trim() || !isDirty || isPending} loading={isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
