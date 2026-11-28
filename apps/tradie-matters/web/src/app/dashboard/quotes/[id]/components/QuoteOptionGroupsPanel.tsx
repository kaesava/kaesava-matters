"use client";

import React from "react";
import { Plus, Star, Trash2 } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Button, Input } from "@kaesava/ui/web";

export interface DraftOptionGroup {
  key: string;
  name: string;
  isRecommended: boolean;
  isSelected: boolean;
}

export function QuoteOptionGroupsPanel({
  groups,
  onChange,
  disabled,
}: {
  groups: DraftOptionGroup[];
  onChange: (next: DraftOptionGroup[]) => void;
  disabled?: boolean;
}) {
  const addPreset = () => {
    const presets = [t("tradieWeb.optionGood"), t("tradieWeb.optionBetter"), t("tradieWeb.optionBest")];
    const name = presets[groups.length] ?? `${t("tradieQuotes.goodBetterBest")} ${groups.length + 1}`;
    onChange([
      ...groups,
      { key: `grp_${Date.now()}_${groups.length}`, name, isRecommended: groups.length === 1, isSelected: groups.length === 0 },
    ]);
  };

  return (
    <section className="ui-card space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieQuotes.goodBetterBest")}</h2>
        {!disabled && (
          <Button type="button" size="sm" variant="secondary" onClick={addPreset}>
            <Plus className="w-3.5 h-3.5" /><span>{t("tradieWeb.addOptionGroup")}</span>
          </Button>
        )}
      </div>
      {groups.length === 0 ? (
        <p className="text-xs text-slate-500">{t("tradieWeb.noOptionGroupsHint")}</p>
      ) : (
        <div className="grid sm:grid-cols-3 gap-3">
          {groups.map((g, idx) => (
            <div key={g.key} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
              <Input
                value={g.name}
                disabled={disabled}
                onChange={(e) => onChange(groups.map((item, i) => (i === idx ? { ...item, name: e.target.value } : item)))}
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(groups.map((item, i) => ({ ...item, isRecommended: i === idx })))}
                  className={`inline-flex items-center gap-1 text-xs font-semibold cursor-pointer ${g.isRecommended ? "text-[#2563eb]" : "text-slate-400"}`}
                >
                  <Star className="w-3.5 h-3.5" /><span>{t("tradieQuotes.recommendedOption")}</span>
                </button>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onChange(groups.filter((_, i) => i !== idx))}
                    className="text-slate-400 hover:text-red-600 cursor-pointer"
                    aria-label={t("common.delete")}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
