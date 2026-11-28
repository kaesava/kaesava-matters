"use client";

import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Button, GenericSelectField, Input, SearchInput } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";
import type { DraftOptionGroup } from "./QuoteOptionGroupsPanel";

export interface DraftQuoteLine {
  optionGroupKey?: string;
  pricebookItemId?: string | null;
  description: string;
  quantity: number;
  unitCostExTax: number;
  unitSellPrice: number;
  taxCode: "GST" | "GST_FREE";
}

export function QuoteLinesEditor({
  lines,
  groups,
  onChange,
  disabled,
}: {
  lines: DraftQuoteLine[];
  groups: DraftOptionGroup[];
  onChange: (next: DraftQuoteLine[]) => void;
  disabled?: boolean;
}) {
  const [pbQuery, setPbQuery] = useState("");
  const pbSearch = trpc.pricebook.fuzzySearch.useQuery(
    { query: pbQuery || undefined, limit: 8 },
    { enabled: !disabled }
  );

  const addFromPricebook = (item: { id: string; name: string; unitCostExTax: string; sellPriceExTax: string; taxCode: string }) => {
    onChange([
      ...lines,
      {
        optionGroupKey: groups[0]?.key,
        pricebookItemId: item.id,
        description: item.name,
        quantity: 1,
        unitCostExTax: Number(item.unitCostExTax) || 0,
        unitSellPrice: Number(item.sellPriceExTax) || 0,
        taxCode: item.taxCode === "GST_FREE" ? "GST_FREE" : "GST",
      },
    ]);
  };

  const addBlankLine = () => {
    onChange([...lines, { optionGroupKey: groups[0]?.key, description: "", quantity: 1, unitCostExTax: 0, unitSellPrice: 0, taxCode: "GST" }]);
  };

  return (
    <section className="ui-card space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieWeb.quoteLinesTitle")}</h2>
        {!disabled && (
          <Button type="button" size="sm" variant="secondary" onClick={addBlankLine}>
            <Plus className="w-3.5 h-3.5" /><span>{t("tradieWeb.addLineItem")}</span>
          </Button>
        )}
      </div>

      {!disabled && (
        <div className="space-y-2">
          <SearchInput value={pbQuery} onChange={setPbQuery} placeholder={t("tradieWeb.searchPricebookPlaceholder")} />
          {(pbSearch.data ?? []).length > 0 && pbQuery.trim().length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(pbSearch.data ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addFromPricebook(item)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 text-xs font-medium text-[#1B2B4B] cursor-pointer"
                >
                  + {item.name} (${item.sellPriceExTax})
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg border border-slate-100 bg-slate-50/50">
            <div className="col-span-12 sm:col-span-5">
              <Input
                value={line.description}
                disabled={disabled}
                placeholder={t("tradieWeb.lineDescriptionLabel")}
                onChange={(e) => onChange(lines.map((l, i) => (i === idx ? { ...l, description: e.target.value } : l)))}
              />
            </div>
            {groups.length > 0 && (
              <div className="col-span-6 sm:col-span-2">
                <GenericSelectField
                  value={line.optionGroupKey ?? ""}
                  disabled={disabled}
                  onChange={(val) => onChange(lines.map((l, i) => (i === idx ? { ...l, optionGroupKey: val || undefined } : l)))}
                  options={[{ value: "", label: t("tradieWeb.baseOption") }, ...groups.map((g) => ({ value: g.key, label: g.name }))]}
                />
              </div>
            )}
            <div className="col-span-3 sm:col-span-2">
              <Input
                type="number"
                step="0.01"
                min="0.01"
                disabled={disabled}
                value={String(line.quantity)}
                onChange={(e) => onChange(lines.map((l, i) => (i === idx ? { ...l, quantity: Number(e.target.value) || 0 } : l)))}
              />
            </div>
            <div className="col-span-6 sm:col-span-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                disabled={disabled}
                value={String(line.unitSellPrice)}
                onChange={(e) => onChange(lines.map((l, i) => (i === idx ? { ...l, unitSellPrice: Number(e.target.value) || 0 } : l)))}
              />
            </div>
            <div className="col-span-3 sm:col-span-1 flex justify-end">
              {!disabled && lines.length > 1 && (
                <button type="button" onClick={() => onChange(lines.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-600 cursor-pointer" aria-label={t("common.delete")}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
