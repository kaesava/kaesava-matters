"use client";

import React, { useState } from "react";
import { Camera, Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, GenericListView, Tabs, useCurrencyLocale, useToast, type GenericListColumn } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { CreatePurchaseOrderModal } from "./components/CreatePurchaseOrderModal";
import { ReceiptOcrModal } from "./components/ReceiptOcrModal";

interface BillRow { id: string; supplierName: string; billNumber: string | null; issueDate: string; totalIncTax: string; source: string; status: string }
interface PoRow { id: string; poNumber: string; supplierName: string; totalExTax: string; status: string }

export default function SuppliersPage() {
  const { currency, locale } = useCurrencyLocale();
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("bills");
  const [search, setSearch] = useState("");
  const [ocrOpen, setOcrOpen] = useState(false);
  const [poOpen, setPoOpen] = useState(false);

  const billsQuery = trpc.suppliers.listBills.useQuery();
  const posQuery = trpc.suppliers.listPurchaseOrders.useQuery();
  const sendPoMut = trpc.suppliers.sendPurchaseOrder.useMutation({
    onSuccess: async () => { await utils.suppliers.listPurchaseOrders.invalidate(); success(t("tradieWeb.poSentSuccess")); },
    onError: (err) => showError(err.message),
  });
  const convertPoMut = trpc.suppliers.convertPurchaseOrderToBill.useMutation({
    onSuccess: async () => { await Promise.all([utils.suppliers.listPurchaseOrders.invalidate(), utils.suppliers.listBills.invalidate()]); success(t("tradieWeb.poConvertedSuccess")); },
    onError: (err) => showError(err.message),
  });

  const bills = ((billsQuery.data ?? []) as BillRow[]).filter((b) => !search || b.supplierName.toLowerCase().includes(search.toLowerCase()));
  const pos = ((posQuery.data ?? []) as PoRow[]).filter((p) => !search || p.supplierName.toLowerCase().includes(search.toLowerCase()) || p.poNumber.toLowerCase().includes(search.toLowerCase()));

  const billCols: GenericListColumn<BillRow>[] = [
    { key: "billNumber", header: t("tradieWeb.billNumberLabel"), render: (b) => <span className="font-mono text-xs font-bold">{b.billNumber || "-"}</span> },
    { key: "supplier", header: t("tradieWeb.supplierNameLabel"), render: (b) => <span className="font-semibold text-[#1B2B4B]">{b.supplierName}</span> },
    { key: "issueDate", header: t("tradieWeb.issueDateLabel"), render: (b) => <span className="text-xs text-slate-600">{b.issueDate}</span> },
    { key: "source", header: t("tradieWeb.sourceLabel"), render: (b) => <Badge variant="primary">{b.source}</Badge> },
    { key: "total", header: t("tradieWeb.totalIncTaxLabel"), align: "right", render: (b) => <span className="font-mono tabular-nums">{formatCurrency(Number(b.totalIncTax), currency, locale)}</span> },
  ];
  const poCols: GenericListColumn<PoRow>[] = [
    { key: "poNumber", header: t("tradieWeb.poNumberLabel"), render: (p) => <span className="font-mono text-xs font-bold text-[#2563eb]">{p.poNumber}</span> },
    { key: "supplier", header: t("tradieWeb.supplierNameLabel"), render: (p) => <span className="font-semibold text-[#1B2B4B]">{p.supplierName}</span> },
    { key: "status", header: t("tradieJobs.statusLabel"), render: (p) => <Badge variant="primary">{p.status}</Badge> },
    { key: "total", header: t("tradieWeb.subtotalExTaxLabel"), align: "right", render: (p) => <span className="font-mono tabular-nums">{formatCurrency(Number(p.totalExTax), currency, locale)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.status === "DRAFT" && <Button type="button" size="sm" variant="secondary" loading={sendPoMut.isPending} onClick={() => sendPoMut.mutate({ id: p.id })}>{t("tradieWeb.sendPoAction")}</Button>}
          {p.status !== "BILLED" && <Button type="button" size="sm" loading={convertPoMut.isPending} onClick={() => convertPoMut.mutate({ id: p.id })}>{t("tradieSync.convertToBillCta")}</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.navSuppliers")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.suppliersSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setOcrOpen(true)}><Camera className="w-4 h-4" /><span>{t("tradieSync.scanReceiptCta")}</span></Button>
          <Button type="button" onClick={() => setPoOpen(true)}><Plus className="w-4 h-4" /><span>{t("tradieWeb.createPoAction")}</span></Button>
        </div>
      </div>
      <Tabs activeTab={tab} onChange={(next) => { setTab(next); setSearch(""); }} tabs={[{ id: "bills", label: t("tradieSync.supplierBillsTitle") }, { id: "pos", label: t("tradieSync.purchaseOrdersTitle") }]} />
      {tab === "bills" ? (
        <GenericListView items={bills} columns={billCols} isLoading={billsQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.supplierNameLabel")} emptyMessage={t("tradieWeb.noBillsEmpty")} />
      ) : (
        <GenericListView items={pos} columns={poCols} isLoading={posQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.supplierNameLabel")} emptyMessage={t("tradieWeb.noPurchaseOrdersEmpty")} />
      )}
      <ReceiptOcrModal isOpen={ocrOpen} onClose={() => setOcrOpen(false)} />
      <CreatePurchaseOrderModal isOpen={poOpen} onClose={() => setPoOpen(false)} />
    </div>
  );
}
