"use client";

import React, { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, GenericListView, Tabs, type GenericListColumn } from "@kaesava/ui/web";
import { CsvImportWizardModal } from "../../../components/CsvImportWizardModal";
import { trpc } from "../../../lib/trpc";
import { CustomerDetailDrawer } from "./components/CustomerDetailDrawer";
import { CustomerFormModal, type CustomerRecord } from "./components/CustomerFormModal";
import { SiteDetailDrawer } from "./components/SiteDetailDrawer";
import { SiteFormModal, type SiteRecord } from "./components/SiteFormModal";

export default function CustomersPage() {
  const [tab, setTab] = useState("customers");
  const [search, setSearch] = useState("");
  const [customerModal, setCustomerModal] = useState<{ open: boolean; item: CustomerRecord | null }>({ open: false, item: null });
  const [siteModal, setSiteModal] = useState<{ open: boolean; item: SiteRecord | null }>({ open: false, item: null });
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [selectedSite, setSelectedSite] = useState<SiteRecord | null>(null);
  const [csvOpen, setCsvOpen] = useState(false);

  const customersQuery = trpc.customers.list.useQuery({ search: search || undefined, limit: 50 }, { enabled: tab === "customers" });
  const sitesQuery = trpc.sites.list.useQuery({ search: search || undefined, limit: 50 }, { enabled: tab === "sites" });

  const customerCols: GenericListColumn<CustomerRecord>[] = [
    { key: "name", header: t("tradieCrm.customerNameLabel"), render: (c) => <span className="font-semibold text-[#1B2B4B]">{c.name}</span> },
    { key: "type", header: t("tradieCrm.customerTypeLabel"), render: (c) => <Badge variant="primary">{c.customerType}</Badge> },
    { key: "phone", header: t("tradieCrm.phoneLabel"), render: (c) => <span className="font-mono text-xs text-slate-600">{c.mobile ?? c.phone ?? "-"}</span> },
    { key: "email", header: t("tradieCrm.emailLabel"), render: (c) => <span className="text-xs text-slate-600">{c.email ?? "-"}</span> },
  ];

  const siteCols: GenericListColumn<SiteRecord>[] = [
    { key: "name", header: t("tradieCrm.siteNameLabel"), render: (s) => <span className="font-semibold text-[#1B2B4B]">{s.name}</span> },
    { key: "address", header: t("tradieCrm.addressLine1Label"), render: (s) => <span>{[s.addressLine1, s.suburb, s.state].filter(Boolean).join(", ")}</span> },
    { key: "keySafe", header: t("tradieCrm.keySafeCodeLabel"), render: (s) => <span className="font-mono text-xs">{s.keySafeCode ?? "-"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.navCustomersSites")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.customersSubtitle")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setCsvOpen(true)}>
            <Upload className="w-4 h-4" />
            <span>{t("tradieWeb.importCustomersCsvAction")}</span>
          </Button>
          <Button type="button" onClick={() => tab === "customers" ? setCustomerModal({ open: true, item: null }) : setSiteModal({ open: true, item: null })}>
            <Plus className="w-4 h-4" />
            <span>{tab === "customers" ? t("tradieCrm.addCustomerAction") : t("tradieCrm.addSiteAction")}</span>
          </Button>
        </div>
      </div>

      <Tabs
        activeTab={tab}
        onChange={(next) => { setTab(next); setSearch(""); }}
        tabs={[
          { id: "customers", label: t("tradieCrm.customersTitle") },
          { id: "sites", label: t("tradieCrm.sitesTitle") },
        ]}
      />

      {tab === "customers" ? (
        <GenericListView items={(customersQuery.data ?? []) as CustomerRecord[]} columns={customerCols} isLoading={customersQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.searchCustomersPlaceholder")} emptyMessage={t("tradieWeb.noCustomersEmpty")} onRowClick={setSelectedCustomer} />
      ) : (
        <GenericListView items={(sitesQuery.data ?? []) as SiteRecord[]} columns={siteCols} isLoading={sitesQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.searchSitesPlaceholder")} emptyMessage={t("tradieWeb.noSitesEmpty")} onRowClick={setSelectedSite} />
      )}

      <CustomerFormModal isOpen={customerModal.open} onClose={() => setCustomerModal({ open: false, item: null })} initial={customerModal.item} />
      <SiteFormModal isOpen={siteModal.open} onClose={() => setSiteModal({ open: false, item: null })} initial={siteModal.item} />
      <CustomerDetailDrawer customer={selectedCustomer} onClose={() => setSelectedCustomer(null)} onEdit={(c) => { setSelectedCustomer(null); setCustomerModal({ open: true, item: c }); }} />
      <SiteDetailDrawer site={selectedSite} onClose={() => setSelectedSite(null)} onEdit={(s) => { setSelectedSite(null); setSiteModal({ open: true, item: s }); }} />
      <CsvImportWizardModal isOpen={csvOpen} onClose={() => setCsvOpen(false)} mode="customers" />
    </div>
  );
}
