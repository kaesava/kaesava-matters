"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { FormLabel, SearchInput } from "@kaesava/ui/web";
import { useAddressLookup } from "../shared/useAddressLookup.js";
import type { AddressValue, SearchAddressesResult } from "../types.js";
import { ManualAddressInputs } from "./ManualAddressInputs.js";

export interface SmartAddressFieldProps {
  label?: string;
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  onSearch: (query: string) => Promise<SearchAddressesResult>;
  disabled?: boolean;
  required?: boolean;
}

export function SmartAddressField({
  label,
  value,
  onChange,
  onSearch,
  disabled,
  required,
}: SmartAddressFieldProps) {
  const initialQuery = [value.streetLine, value.suburb, value.state, value.postcode].filter(Boolean).join(", ");
  const {
    query,
    setQuery,
    suggestions,
    isSearching,
    manualMode,
    timedOut,
    hasSearched,
    handleSelectSuggestion,
    toggleManualMode,
  } = useAddressLookup({ initialQuery, onSearch, onSelect: onChange });

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <FormLabel required={required}>{label ?? t("geo.addressLabel")}</FormLabel>
        <button
          type="button"
          onClick={toggleManualMode}
          disabled={disabled}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50"
        >
          {manualMode ? t("geo.searchModeAction") : t("geo.manualEntryAction")}
        </button>
      </div>

      {timedOut && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {t("geo.fallbackNotice")}
        </p>
      )}

      {manualMode ? (
        <ManualAddressInputs value={value} onChange={onChange} disabled={disabled} />
      ) : (
        <div className="relative">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={t("geo.searchPlaceholder")}
          />
          {isSearching && (
            <p className="mt-1.5 text-xs text-slate-500">{t("geo.searching")}</p>
          )}
          {!isSearching && hasSearched && suggestions.length === 0 && (
            <p className="mt-1.5 text-xs text-slate-500">{t("geo.noResults")}</p>
          )}
          {suggestions.length > 0 && (
            <ul className="mt-1 max-h-56 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm divide-y divide-slate-100">
              {suggestions.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left px-3 py-2 text-sm text-slate-800 hover:bg-slate-50"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
