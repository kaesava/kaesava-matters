"use client";

import React, { useState } from "react";
import { PackagePlus, Plus, Star, Upload } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, GenericListView, GenericSelectField, useCurrencyLocale, type GenericListColumn } from "@kaesava/ui/web";
import { CsvImportWizardModal } from "../../../components/CsvImportWizardModal";
import { trpc } from "../../../lib/trpc";
import { PricebookItemModal, type PricebookItemRecord } from "./components/PricebookItemModal";
import { StarterPackPickerModal } from "./components/StarterPackPickerModal";

type ItemTypeFilter = "ALL" | "MATERIAL" | "LABOUR" | "EQUIPMENT" | "SUBCONTRACT";

export default function PricebookPage() {
  const { currency, locale } = useCurrencyLocale();
  const [query, setQuery] = useState("");
  const [itemType, setItemType] = useState<ItemTypeFilter>("ALL");
  const [favouritesOnly, setFavouritesOnly] = useState(false);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: PricebookItemRecord | null }>({ open: false, item: null });
  const [packOpen, setPackOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);

  const searchQuery = trpc.pricebook.fuzzySearch.useQuery({
    query,
    itemType: itemType === "ALL" ? undefined : itemType,
    favouritesOnly: favouritesOnly || undefined,
    limit: 100,
  });

  const columns: GenericListColumn<PricebookItemRecord>[] = [
    { key: "name", header: t("common.name"), render: (i) => <span className="flex items-center gap-1.5 font-semibold text-[#1B2B4B]">{i.isFavourite && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}{i.name}</span> },
    { key: "sku", header: t("tradieCrm.skuLabel"), render: (i) => <span className="font-mono text-xs text-slate-500">{i.sku ?? "-"}</span> },
    { key: "type", header: t("tradieWeb.itemTypeLabel"), render: (i) => <Badge variant="primary">{i.itemType}</Badge> },
    { key: "cost", header: t("tradieCrm.unitCostLabel"), align: "right", render: (i) => <span className="font-mono tabular-nums">{formatCurrency(Number(i.unitCostExTax), currency, locale)}</span> },
    { key: "sell", header: t("tradieCrm.sellPriceLabel"), align: "right", render: (i) => <span className="font-mono tabular-nums font-bold text-[#1B2B4B]">{formatCurrency(Number(i.sellPriceExTax), currency, locale)}</span> },
  ];

  const toolbarActions = (
    <div className="flex flex-wrap items-center gap-2">
      <div className="w-40">
        <GenericSelectField value={itemType} onChange={(v) => setItemType(v as ItemTypeFilter)} options={[{ value: "ALL", label: t("tradieWeb.allTypesFilter") }, { value: "MATERIAL", label: t("tradieWeb.itemTypeMaterial") }, { value: "LABOUR", label: t("tradieWeb.itemTypeLabour") }, { value: "EQUIPMENT", label: t("tradieWeb.itemTypeEquipment") }, { value: "SUBCONTRACT", label: t("tradieWeb.itemTypeSubcontract") }]} />
      </div>
      <Button type="button" variant={favouritesOnly ? "primary" : "secondary"} size="sm" onClick={() => setFavouritesOnly((v) => !v)}>{t("tradieWeb.favouritesOnlyFilter")}</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieCrm.pricebookTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.pricebookSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => setPackOpen(true)}><PackagePlus className="w-4 h-4" /><span>{t("tradieCrm.installStarterPackAction")}</span></Button>
          <Button type="button" variant="secondary" onClick={() => setCsvOpen(true)}><Upload className="w-4 h-4" /><span>{t("tradieCrm.importCsvAction")}</span></Button>
          <Button type="button" onClick={() => setItemModal({ open: true, item: null })}><Plus className="w-4 h-4" /><span>{t("tradieCrm.addPricebookItemAction")}</span></Button>
        </div>
      </div>

      <GenericListView items={(searchQuery.data ?? []) as PricebookItemRecord[]} columns={columns} isLoading={searchQuery.isLoading} searchValue={query} onSearchChange={setQuery} searchPlaceholder={t("tradieWeb.searchPricebookPlaceholder")} toolbarActions={toolbarActions} emptyMessage={t("tradieWeb.noPricebookEmpty")} onRowClick={(item) => setItemModal({ open: true, item })} />

      <PricebookItemModal isOpen={itemModal.open} onClose={() => setItemModal({ open: false, item: null })} initial={itemModal.item} />
      <StarterPackPickerModal isOpen={packOpen} onClose={() => setPackOpen(false)} />
      <CsvImportWizardModal isOpen={csvOpen} onClose={() => setCsvOpen(false)} mode="pricebook" />
    </div>
  );
}
