"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { calculateQuoteTotals } from "@tradie-matters/capability-operations";
import { Button, formatCurrency, FormLabel, GenericSelectField, Input, useCurrencyLocale } from "@kaesava/ui/web";
import type { DraftOptionGroup } from "./QuoteOptionGroupsPanel";
import type { DraftQuoteLine } from "./QuoteLinesEditor";

export function QuoteSummaryCard({
  gstMode,
  depositType,
  depositValue,
  followUpEnabled,
  groups,
  lines,
  onGstModeChange,
  onDepositTypeChange,
  onDepositValueChange,
  onFollowUpChange,
  onSave,
  onSend,
  onPreviewPdf,
  hasPdf,
  isSaving,
  isSending,
  disabled,
}: {
  gstMode: "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE";
  depositType: "NONE" | "PERCENT" | "FIXED";
  depositValue: number;
  followUpEnabled: boolean;
  groups: DraftOptionGroup[];
  lines: DraftQuoteLine[];
  onGstModeChange: (v: "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE") => void;
  onDepositTypeChange: (v: "NONE" | "PERCENT" | "FIXED") => void;
  onDepositValueChange: (v: number) => void;
  onFollowUpChange: (v: boolean) => void;
  onSave: () => void;
  onSend: () => void;
  onPreviewPdf: () => void;
  hasPdf: boolean;
  isSaving: boolean;
  isSending: boolean;
  disabled?: boolean;
}) {
  const { currency, locale } = useCurrencyLocale();
  const totals = calculateQuoteTotals({ gstMode, depositType, depositValue, optionGroups: groups, lines });

  return (
    <section className="ui-card space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <FormLabel>{t("tradieWeb.gstModeLabel")}</FormLabel>
          <GenericSelectField
            value={gstMode}
            disabled={disabled}
            onChange={(v) => onGstModeChange(v as "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE")}
            options={[
              { value: "EXCLUSIVE", label: t("tradieWeb.gstExclusive") },
              { value: "INCLUSIVE", label: t("tradieWeb.gstInclusive") },
              { value: "GST_FREE", label: t("tradieWeb.gstFree") },
            ]}
          />
        </div>
        <div>
          <FormLabel>{t("tradieQuotes.depositRequired")}</FormLabel>
          <GenericSelectField
            value={depositType}
            disabled={disabled}
            onChange={(v) => onDepositTypeChange(v as "NONE" | "PERCENT" | "FIXED")}
            options={[
              { value: "NONE", label: t("tradieWeb.depositNone") },
              { value: "PERCENT", label: t("tradieWeb.depositPercent") },
              { value: "FIXED", label: t("tradieWeb.depositFixed") },
            ]}
          />
        </div>
        {depositType !== "NONE" && (
          <div>
            <FormLabel>{t("tradieWeb.depositValueLabel")}</FormLabel>
            <Input type="number" step="0.01" min="0" disabled={disabled} value={String(depositValue)} onChange={(e) => onDepositValueChange(Number(e.target.value) || 0)} />
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
        <input type="checkbox" checked={followUpEnabled} onChange={(e) => onFollowUpChange(e.target.checked)} className="rounded border-slate-300" />
        <span>{t("tradieWeb.autoFollowUpLabel")}</span>
      </label>

      <div className="border-t border-slate-100 pt-3 space-y-1 text-sm text-right">
        <p className="text-slate-500">{t("tradieWeb.subtotalExGst")}: <span className="font-mono font-semibold text-[#1B2B4B]">{formatCurrency(totals.subtotalExTax, currency, locale)}</span></p>
        <p className="text-slate-500">{t("tradieWeb.gstAmountLabel")}: <span className="font-mono font-semibold text-[#1B2B4B]">{formatCurrency(totals.totalTax, currency, locale)}</span></p>
        <p className="text-base font-extrabold text-[#1B2B4B]">{t("tradieWeb.totalIncGstLabel")}: <span className="font-mono">{formatCurrency(totals.totalIncTax, currency, locale)}</span></p>
        {totals.depositAmountDue > 0 && (
          <p className="text-xs font-bold text-[#2563eb]">{t("tradieQuotes.depositRequired")}: <span className="font-mono">{formatCurrency(totals.depositAmountDue, currency, locale)}</span></p>
        )}
      </div>

      <div className="flex flex-wrap justify-end gap-2 pt-2">
        {hasPdf && <Button type="button" variant="secondary" onClick={onPreviewPdf}>{t("tradieWeb.previewPdfAction")}</Button>}
        {!disabled && <Button type="button" variant="secondary" disabled={isSaving} onClick={onSave}>{t("common.save")}</Button>}
        <Button type="button" disabled={isSending} onClick={onSend}>{t("tradieQuotes.sendQuote")}</Button>
      </div>
    </section>
  );
}
