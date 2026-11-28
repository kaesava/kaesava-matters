"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import type { TenantDangerZoneProps } from "../ui-contracts.js";

export function TenantDangerZoneSection({
  tenantName,
  isOwner,
  isSoleOwner,
  isSubmitting = false,
  onLeave,
  onDelete,
}: TenantDangerZoneProps) {
  const [confirmMode, setConfirmMode] = useState<"leave" | "delete" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const inputId = useId();

  const expectedPhrase = confirmMode === "delete" ? tenantName : t("settings.dangerZone.leaveConfirmPhrase");
  const isConfirmed = confirmText.trim() === expectedPhrase;

  async function handleConfirm() {
    if (!isConfirmed || isSubmitting) return;
    if (confirmMode === "delete") await onDelete();
    if (confirmMode === "leave") await onLeave();
    setConfirmMode(null);
    setConfirmText("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-red-200 bg-red-50/40 p-6 dark:border-red-900/50 dark:bg-red-950/20">
      <div>
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">{t("settings.dangerZone.title")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("settings.dangerZone.subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {(!isOwner || !isSoleOwner) && (
          <button type="button" onClick={() => { setConfirmMode("leave"); setConfirmText(""); }} className="h-10 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-100">
            {t("settings.dangerZone.leaveCta")}
          </button>
        )}
        {isOwner && (
          <button type="button" onClick={() => { setConfirmMode("delete"); setConfirmText(""); }} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700">
            {t("settings.dangerZone.deleteCta")}
          </button>
        )}
      </div>
      {confirmMode && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-white p-4 dark:border-red-800 dark:bg-slate-900">
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-800 dark:text-slate-200">
            {t("settings.typeToConfirmLabel", { phrase: expectedPhrase })}
          </label>
          <input id={inputId} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800" />
          <div className="flex gap-2">
            <button type="button" onClick={() => setConfirmMode(null)} className="h-10 rounded-lg border border-slate-300 px-4 text-sm">{t("common.cancel")}</button>
            <button type="button" disabled={!isConfirmed || isSubmitting} onClick={handleConfirm} className="h-10 rounded-lg bg-red-600 px-4 text-sm font-medium text-white disabled:opacity-50">
              {isSubmitting ? t("common.loading") : t("common.confirm")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
