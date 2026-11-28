"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import type { UserProfileSettingsProps } from "../ui-contracts.js";

export function UserProfileSettingsSection({
  displayName: initialName,
  loginEmail,
  notificationEmail: initialNotifEmail,
  phoneNumber: initialPhone = "",
  isSaving = false,
  onSave,
}: UserProfileSettingsProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [notificationEmail, setNotificationEmail] = useState(initialNotifEmail);
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const nameId = useId();
  const loginId = useId();
  const notifId = useId();
  const phoneId = useId();

  const isDirty =
    displayName !== initialName ||
    notificationEmail !== initialNotifEmail ||
    phoneNumber !== initialPhone;
  const isValid = displayName.trim().length > 0 && notificationEmail.includes("@");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid || isSaving) return;
    await onSave({ displayName: displayName.trim(), notificationEmail: notificationEmail.trim(), phoneNumber: phoneNumber.trim() || undefined });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("settings.myDetailsTitle")}</h2>
      <div>
        <label htmlFor={nameId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("common.name")}</label>
        <input id={nameId} value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder={t("settings.displayNamePlaceholder")} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <div>
        <label htmlFor={loginId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.loginEmailLabel")}</label>
        <input id={loginId} value={loginEmail} disabled className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50" />
      </div>
      <div>
        <label htmlFor={notifId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.notificationEmailLabel")}</label>
        <input id={notifId} type="email" value={notificationEmail} onChange={(e) => setNotificationEmail(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
        <p className="mt-1 text-xs text-slate-500">{t("settings.notificationEmailHint")}</p>
      </div>
      <div>
        <label htmlFor={phoneId} className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">{t("settings.phoneNumberLabel")}</label>
        <input id={phoneId} value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
      </div>
      <div className="flex justify-end">
        <button type="submit" disabled={!isDirty || !isValid || isSaving} className="h-10 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">
          {isSaving ? t("common.loading") : t("settings.saveProfileCta")}
        </button>
      </div>
    </form>
  );
}
