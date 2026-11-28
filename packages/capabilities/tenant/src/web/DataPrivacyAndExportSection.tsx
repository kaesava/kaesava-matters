"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import type { DataPrivacyAndExportProps } from "../ui-contracts.js";

export function DataPrivacyAndExportSection({
  telemetryConsent,
  isExporting = false,
  onToggleTelemetry,
  onExportData,
  onOpenPrivacyPolicy,
  onOpenTerms,
}: DataPrivacyAndExportProps) {
  const isGranted = telemetryConsent === "granted";

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("privacy.title")}</h2>
      <p className="text-sm text-slate-600 dark:text-slate-400">{t("privacy.aussiePrivacyDetail")}</p>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4 dark:border-slate-800">
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("privacy.analyticsConsentToggle")}</p>
          <p className="text-xs text-slate-500">{t("privacy.analyticsConsentToggleDesc")}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isGranted}
          onClick={() => onToggleTelemetry(!isGranted)}
          className={`h-9 rounded-lg px-3 text-xs font-medium ${isGranted ? "bg-blue-600 text-white" : "border border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300"}`}
        >
          {isGranted ? t("privacy.analyticsConsentAccept") : t("privacy.analyticsConsentDecline")}
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={isExporting} onClick={onExportData} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900">
          {isExporting ? t("common.loading") : t("privacy.exportZipButton")}
        </button>
        {onOpenPrivacyPolicy && (
          <button type="button" onClick={onOpenPrivacyPolicy} className="text-xs text-blue-600 hover:underline">{t("privacy.viewPublicPrivacyPolicyLink")}</button>
        )}
        {onOpenTerms && (
          <button type="button" onClick={onOpenTerms} className="text-xs text-blue-600 hover:underline">{t("privacy.viewPublicTermsLink")}</button>
        )}
      </div>
    </div>
  );
}
