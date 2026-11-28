"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, GenericListView, useCurrencyLocale, type GenericListColumn } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { ConvertJobInvoiceModal } from "./components/ConvertJobInvoiceModal";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  invoiceType: string;
  status: string;
  dueDate: string;
  totalIncTax: string;
  balanceDue: string;
}

const INVOICE_STATUSES = [
  { key: "ALL", labelKey: "tradieWeb.allStatuses" },
  { key: "DRAFT", labelKey: "tradieInvoices.statusDraft" },
  { key: "SENT", labelKey: "tradieInvoices.statusSent" },
  { key: "PARTIALLY_PAID", labelKey: "tradieInvoices.statusPartiallyPaid" },
  { key: "PAID", labelKey: "tradieInvoices.statusPaid" },
  { key: "OVERDUE", labelKey: "tradieInvoices.statusOverdue" },
] as const;

export default function InvoicesPage() {
  const router = useRouter();
  const { currency, locale } = useCurrencyLocale();
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [convertOpen, setConvertOpen] = useState(false);

  const invoicesQuery = trpc.invoices.list.useQuery(
    statusFilter === "ALL" ? undefined : { status: statusFilter }
  );

  const filtered = (invoicesQuery.data ?? []).filter(
    (inv) => !search.trim() || inv.invoiceNumber.toLowerCase().includes(search.toLowerCase())
  );

  const columns: GenericListColumn<InvoiceRow>[] = [
    { key: "invoiceNumber", header: t("tradieWeb.invoiceNumberLabel"), render: (i) => <span className="font-mono text-xs font-bold text-[#2563eb]">{i.invoiceNumber}</span> },
    { key: "type", header: t("tradieWeb.invoiceTypeLabel"), render: (i) => <Badge variant="primary">{i.invoiceType}</Badge> },
    { key: "status", header: t("tradieJobs.statusLabel"), render: (i) => <Badge variant={i.status === "PAID" ? "success" : i.status === "OVERDUE" ? "danger" : "warning"}>{i.status}</Badge> },
    { key: "dueDate", header: t("tradieWeb.dueDateLabel"), render: (i) => <span className="text-xs text-slate-600">{i.dueDate}</span> },
    { key: "total", header: t("tradieWeb.totalIncGstLabel"), align: "right", render: (i) => <span className="font-mono tabular-nums">{formatCurrency(Number(i.totalIncTax), currency, locale)}</span> },
    { key: "balance", header: t("tradieInvoices.balanceDue"), align: "right", render: (i) => <span className="font-mono tabular-nums font-bold">{formatCurrency(Number(i.balanceDue), currency, locale)}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieInvoices.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.invoicesSubtitle")}</p>
        </div>
        <Button type="button" onClick={() => setConvertOpen(true)}>
          <Plus className="w-4 h-4" /><span>{t("tradieInvoices.convertJobToInvoice")}</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {INVOICE_STATUSES.map((s) => (
          <button key={s.key} type="button" onClick={() => setStatusFilter(s.key)} className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${statusFilter === s.key ? "bg-[#2563eb] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      <GenericListView items={filtered as InvoiceRow[]} columns={columns} isLoading={invoicesQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.searchInvoicesPlaceholder")} emptyMessage={t("tradieWeb.noInvoicesEmpty")} onRowClick={(i) => router.push(`/dashboard/invoices/${i.id}`)} />
      <ConvertJobInvoiceModal isOpen={convertOpen} onClose={() => setConvertOpen(false)} />
    </div>
  );
}
