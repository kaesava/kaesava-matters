"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import "../i18n";

type PreviewTabId = "quotes" | "margin" | "crew" | "cashflow";

interface PreviewRow {
  title: string;
  meta: string;
  badge: string;
  tone: "blue" | "emerald" | "amber";
}

const TONE_CLASS: Record<PreviewRow["tone"], string> = {
  blue: "text-[#2563eb] bg-blue-50 border-blue-200",
  emerald: "text-emerald-800 bg-emerald-50 border-emerald-200",
  amber: "text-amber-800 bg-amber-50 border-amber-200",
};

export function TradieHeroPreview() {
  const [activeTab, setActiveTab] = useState<PreviewTabId>("quotes");

  const tabs: { id: PreviewTabId; label: string }[] = [
    { id: "quotes", label: t("tradieWeb.previewTabQuotes") },
    { id: "margin", label: t("tradieWeb.previewTabMargin") },
    { id: "crew", label: t("tradieWeb.previewTabCrew") },
    { id: "cashflow", label: t("tradieWeb.previewTabCashflow") },
  ];

  const panels: Record<PreviewTabId, { summary: string; rows: PreviewRow[] }> = {
    quotes: {
      summary: t("tradieWeb.previewQuotesSummary"),
      rows: [
        { title: t("tradieWeb.previewQuotesRow1Title"), meta: t("tradieWeb.previewQuotesRow1Meta"), badge: t("tradieWeb.previewQuotesRow1Badge"), tone: "blue" },
        { title: t("tradieWeb.previewQuotesRow2Title"), meta: t("tradieWeb.previewQuotesRow2Meta"), badge: t("tradieWeb.previewQuotesRow2Badge"), tone: "emerald" },
        { title: t("tradieWeb.previewQuotesRow3Title"), meta: t("tradieWeb.previewQuotesRow3Meta"), badge: t("tradieWeb.previewQuotesRow3Badge"), tone: "amber" },
      ],
    },
    margin: {
      summary: t("tradieWeb.previewMarginSummary"),
      rows: [
        { title: t("tradieWeb.previewMarginRow1Title"), meta: t("tradieWeb.previewMarginRow1Meta"), badge: t("tradieWeb.previewMarginRow1Badge"), tone: "emerald" },
        { title: t("tradieWeb.previewMarginRow2Title"), meta: t("tradieWeb.previewMarginRow2Meta"), badge: t("tradieWeb.previewMarginRow2Badge"), tone: "amber" },
        { title: t("tradieWeb.previewMarginRow3Title"), meta: t("tradieWeb.previewMarginRow3Meta"), badge: t("tradieWeb.previewMarginRow3Badge"), tone: "blue" },
      ],
    },
    crew: {
      summary: t("tradieWeb.previewCrewSummary"),
      rows: [
        { title: t("tradieWeb.previewCrewRow1Title"), meta: t("tradieWeb.previewCrewRow1Meta"), badge: t("tradieWeb.previewCrewRow1Badge"), tone: "blue" },
        { title: t("tradieWeb.previewCrewRow2Title"), meta: t("tradieWeb.previewCrewRow2Meta"), badge: t("tradieWeb.previewCrewRow2Badge"), tone: "emerald" },
        { title: t("tradieWeb.previewCrewRow3Title"), meta: t("tradieWeb.previewCrewRow3Meta"), badge: t("tradieWeb.previewCrewRow3Badge"), tone: "amber" },
      ],
    },
    cashflow: {
      summary: t("tradieWeb.previewCashflowSummary"),
      rows: [
        { title: t("tradieWeb.previewCashflowRow1Title"), meta: t("tradieWeb.previewCashflowRow1Meta"), badge: t("tradieWeb.previewCashflowRow1Badge"), tone: "emerald" },
        { title: t("tradieWeb.previewCashflowRow2Title"), meta: t("tradieWeb.previewCashflowRow2Meta"), badge: t("tradieWeb.previewCashflowRow2Badge"), tone: "amber" },
        { title: t("tradieWeb.previewCashflowRow3Title"), meta: t("tradieWeb.previewCashflowRow3Meta"), badge: t("tradieWeb.previewCashflowRow3Badge"), tone: "blue" },
      ],
    },
  };

  const current = panels[activeTab];

  return (
    <div className="w-full max-w-4xl mx-auto mt-6 bg-white rounded-3xl border border-slate-200/90 shadow-xl p-5 sm:p-7 text-left space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label={t("tradieWeb.previewHeaderBadge")}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-[#2563eb] text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:text-[#1B2B4B]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-mono font-bold text-slate-500">{current.summary}</span>
      </div>

      <div className="grid gap-3" role="tabpanel">
        {current.rows.map((row) => (
          <div
            key={row.title}
            className="p-4 rounded-2xl bg-[#F7F8FA] border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
          >
            <div className="space-y-0.5">
              <div className="text-sm font-extrabold text-[#1B2B4B]">{row.title}</div>
              <div className="text-xs text-slate-500 font-medium">{row.meta}</div>
            </div>
            <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border w-fit shrink-0 ${TONE_CLASS[row.tone]}`}>
              {row.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
