"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { SmartAddressField } from "@kaesava/capability-geo/web";
import type { AddressValue } from "@kaesava/capability-geo";
import { Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface SiteRecord {
  id: string;
  name: string;
  addressLine1: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  country: string;
  accessNotes: string | null;
  keySafeCode: string | null;
  siteContactName: string | null;
  siteContactPhone: string | null;
}

export interface SiteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initial?: SiteRecord | null;
}

export function SiteFormModal({ isOpen, onClose, initial }: SiteFormModalProps) {
  return <SiteFormModalInner key={isOpen ? (initial?.id ?? "new") : "closed"} isOpen={isOpen} onClose={onClose} initial={initial} />;
}

function SiteFormModalInner({ isOpen, onClose, initial }: SiteFormModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [customerId, setCustomerId] = useState("");
  const [keySafeCode, setKeySafeCode] = useState(initial?.keySafeCode ?? "");
  const [accessNotes, setAccessNotes] = useState(initial?.accessNotes ?? "");
  const [address, setAddress] = useState<AddressValue>({ streetLine: initial?.addressLine1 ?? "", suburb: initial?.suburb ?? "", state: initial?.state ?? "", postcode: initial?.postcode ?? "", country: initial?.country ?? "AU" });
  const customersQuery = trpc.customers.list.useQuery({ limit: 100 }, { enabled: isOpen && !isEdit });

  const createMut = trpc.sites.create.useMutation({ onSuccess: () => utils.sites.list.invalidate() });
  const updateMut = trpc.sites.update.useMutation({ onSuccess: () => utils.sites.invalidate() });
  const archiveMut = trpc.sites.archive.useMutation({ onSuccess: () => utils.sites.list.invalidate() });
  const isPending = createMut.isPending || updateMut.isPending || archiveMut.isPending;
  const canSave = name.trim().length > 0 && address.streetLine.trim().length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = { name: name.trim(), addressLine1: address.streetLine.trim(), suburb: address.suburb || null, state: address.state || null, postcode: address.postcode || null, country: address.country || "AU", keySafeCode: keySafeCode.trim() || null, accessNotes: accessNotes.trim() || null };
    if (isEdit && initial) await updateMut.mutateAsync({ id: initial.id, ...base });
    else await createMut.mutateAsync({ ...base, customerId: customerId || undefined });
    success(t("tradieWeb.siteSaved"));
    onClose();
  };

  const handleArchive = async () => {
    if (!initial) return;
    await archiveMut.mutateAsync({ id: initial.id });
    success(t("tradieWeb.siteArchived"));
    onClose();
  };

  const customerOpts = [{ value: "", label: t("tradieWeb.noLinkedCustomer") }, ...(customersQuery.data ?? []).map((c) => ({ value: c.id, label: c.name }))];

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={canSave} title={isEdit ? t("tradieWeb.editSiteAction") : t("tradieCrm.addSiteAction")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div><FormLabel required>{t("tradieCrm.siteNameLabel")}</FormLabel><Input value={name} onChange={(e) => setName(e.target.value)} autoFocus required /></div>
        <SmartAddressField required value={address} onChange={setAddress} onSearch={(query) => utils.geo.searchAddresses.fetch({ query })} />
        {!isEdit && <div><FormLabel>{t("tradieWeb.linkCustomerLabel")}</FormLabel><GenericSelectField value={customerId} onChange={setCustomerId} options={customerOpts} /></div>}
        <div className="grid grid-cols-2 gap-3">
          <div><FormLabel>{t("tradieCrm.keySafeCodeLabel")}</FormLabel><Input value={keySafeCode} onChange={(e) => setKeySafeCode(e.target.value)} /></div>
          <div><FormLabel>{t("tradieCrm.accessNotesLabel")}</FormLabel><Input value={accessNotes} onChange={(e) => setAccessNotes(e.target.value)} /></div>
        </div>
        <div className="flex items-center justify-between pt-3">
          {isEdit ? <button type="button" onClick={handleArchive} disabled={isPending} className="text-xs font-medium text-slate-400 hover:text-slate-600">{t("tradieWeb.archiveAction")}</button> : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!canSave || isPending} loading={isPending}>{t("common.save")}</Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  );
}
