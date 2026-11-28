"use client";

import React, { useId } from "react";
import { t } from "@kaesava/i18n";
import { FormLabel } from "@kaesava/ui/web";

export interface SetupStep1Data {
  businessName: string;
  tradeType: string;
  abn: string;
  gstRegistered: boolean;
  defaultTaxRatePercent: string;
}

interface Props {
  data: SetupStep1Data;
  onChange: (next: SetupStep1Data) => void;
}

export function SetupStep1Business({ data, onChange }: Props) {
  const nameId = useId();
  const tradeId = useId();
  const abnId = useId();
  const gstId = useId();
  const taxId = useId();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1B2B4B]">{t("tradieWeb.setupStep1Title")}</h2>
      <div>
        <FormLabel required htmlFor={nameId}>{t("tradieSetup.businessNameLabel")}</FormLabel>
        <input
          id={nameId}
          autoFocus
          value={data.businessName}
          onChange={(e) => onChange({ ...data, businessName: e.target.value })}
          placeholder={t("tradieWeb.businessPlaceholder")}
          className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel required htmlFor={tradeId}>{t("tradieSetup.tradeTypeLabel")}</FormLabel>
          <input
            id={tradeId}
            value={data.tradeType}
            onChange={(e) => onChange({ ...data, tradeType: e.target.value })}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
          />
        </div>
        <div>
          <FormLabel htmlFor={abnId}>{t("tradieSetup.abnLabel")}</FormLabel>
          <input
            id={abnId}
            value={data.abn}
            onChange={(e) => onChange({ ...data, abn: e.target.value })}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 items-center">
        <label htmlFor={gstId} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer pt-2">
          <input
            id={gstId}
            type="checkbox"
            checked={data.gstRegistered}
            onChange={(e) => onChange({ ...data, gstRegistered: e.target.checked })}
            className="w-4 h-4 rounded text-[#2563eb]"
          />
          {t("tradieSetup.gstRegisteredLabel")}
        </label>
        <div>
          <FormLabel htmlFor={taxId}>{t("tradieSetup.defaultTaxRateLabel")}</FormLabel>
          <input
            id={taxId}
            value={data.defaultTaxRatePercent}
            onChange={(e) => onChange({ ...data, defaultTaxRatePercent: e.target.value })}
            className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono"
          />
        </div>
      </div>
    </div>
  );
}
