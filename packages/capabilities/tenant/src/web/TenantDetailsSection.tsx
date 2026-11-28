"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import type { TenantDetailsProps } from "../ui-contracts.js";

export function TenantDetailsSection({
  tenantName: initialName,
  country,
  currency,
  timezone: initialTz,
  state: initialState = "",
  postcode: initialPostcode = "",
  isOwner,
  isSaving = false,
  onSave,
}: TenantDetailsProps) {
  const [name, setName] = useState(initialName);
  const [timezone, setTimezone] = useState(initialTz);
  const [state, setState] = useState(initialState ?? "");
  const [postcode, setPostcode] = useState(initialPostcode ?? "");
  const nameId = useId();
  const tzId = useId();
  const stateId = useId();
  const postcodeId = useId();

  const isDirty = name !== initialName || timezone !== initialTz || state !== (initialState ?? "") || postcode !== (initialPostcode ?? "");
  const isValid = name.trim().length > 0 && timezone.trim().length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isOwner || !isValid || isSaving) return;
    await onSave({ name: name.trim(), timezone: timezone.trim(), state: state.trim() || undefined, postcode: postcode.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("settings.householdProfileAndLocation")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.householdNameLabel")}</label>
          <input id={nameId} value={name} disabled={!isOwner} onChange={(e) => setName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div>
          <label htmlFor={tzId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.timezone")}</label>
          <input id={tzId} value={timezone} disabled={!isOwner} onChange={(e) => setTimezone(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div>
          <label htmlFor={stateId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.household.stateLabel")}</label>
          <input id={stateId} value={state} disabled={!isOwner} onChange={(e) => setState(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
        </div>
        <div>
          <label htmlFor={postcodeId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.household.postcodeLabel")}</label>
          <input id={postcodeId} value={postcode} disabled={!isOwner} onChange={(e) => setPostcode(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm disabled:bg-slate-50 dark:border-slate-700 dark:bg-slate-800" />
        </div>
      </div>
      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <span>{`${t("settings.countryLabel")}: ${country}`}</span>
        <span>{`${t("settings.currency")}: ${currency}`}</span>
      </div>
      {isOwner && (
        <div className="flex justify-end">
          <button type="submit" disabled={!isDirty || !isValid || isSaving} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">
            {isSaving ? t("common.loading") : t("settings.saveHouseholdCta")}
          </button>
        </div>
      )}
    </form>
  );
}
