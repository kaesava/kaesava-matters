"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, GenericListView, useCurrencyLocale, type GenericListColumn } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { NewQuoteModal } from "./components/NewQuoteModal";

interface QuoteRow {
  id: string;
  quoteNumber: string;
  title: string;
  status: string;
  totalIncTax: string;
  depositAmountDue: string;
}

const QUOTE_STATUSES = [
  { key: "ALL", labelKey: "tradieWeb.allStatuses" },
  { key: "DRAFT", labelKey: "tradieQuotes.statusDraft" },
  { key: "SENT", labelKey: "tradieQuotes.statusSent" },
  { key: "VIEWED", labelKey: "tradieQuotes.statusViewed" },
  { key: "ACCEPTED", labelKey: "tradieQuotes.statusAccepted" },
  { key: "DECLINED", labelKey: "tradieQuotes.statusDeclined" },
] as const;

export default function QuotesPage() {
  const router = useRouter();
  const { currency, locale } = useCurrencyLocale();
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const quotesQuery = trpc.quotes.list.useQuery(
    statusFilter === "ALL" ? undefined : { status: statusFilter }
  );

  const filtered = (quotesQuery.data ?? []).filter(
    (q) =>
      !search.trim() ||
      q.quoteNumber.toLowerCase().includes(search.toLowerCase()) ||
      q.title.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GenericListColumn<QuoteRow>[] = [
    { key: "quoteNumber", header: t("tradieWeb.quoteNumberLabel"), render: (q) => <span className="font-mono text-xs font-bold text-[#2563eb]">{q.quoteNumber}</span> },
    { key: "title", header: t("tradieWeb.quoteTitleLabel"), render: (q) => <span className="font-semibold text-[#1B2B4B]">{q.title}</span> },
    { key: "status", header: t("tradieJobs.statusLabel"), render: (q) => <Badge variant={q.status === "ACCEPTED" ? "success" : q.status === "DECLINED" ? "danger" : "primary"}>{q.status}</Badge> },
    { key: "total", header: t("tradieWeb.totalIncGstLabel"), align: "right", render: (q) => <span className="font-mono tabular-nums">{formatCurrency(Number(q.totalIncTax), currency, locale)}</span> },
    { key: "deposit", header: t("tradieQuotes.depositRequired"), align: "right", render: (q) => <span className="font-mono tabular-nums text-slate-500">{Number(q.depositAmountDue) > 0 ? formatCurrency(Number(q.depositAmountDue), currency, locale) : "-"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieQuotes.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.quotesSubtitle")}</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" /><span>{t("tradieQuotes.newQuote")}</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {QUOTE_STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === s.key ? "bg-[#2563eb] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      <GenericListView
        items={filtered as QuoteRow[]}
        columns={columns}
        isLoading={quotesQuery.isLoading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("tradieWeb.searchQuotesPlaceholder")}
        emptyMessage={t("tradieWeb.noQuotesEmpty")}
        onRowClick={(q) => router.push(`/dashboard/quotes/${q.id}`)}
      />
      <NewQuoteModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
