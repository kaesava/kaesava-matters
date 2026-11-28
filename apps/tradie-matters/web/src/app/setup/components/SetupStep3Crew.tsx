"use client";

import React, { useId } from "react";
import { t } from "@kaesava/i18n";
import { FormLabel } from "@kaesava/ui/web";

export interface SetupStep3Data {
  tradeLicenseNumber: string;
  licenseExpiryDate: string;
  internalHourlyCostRate: string;
  defaultChargeOutRate: string;
  isFieldActive: boolean;
}

interface Props {
  data: SetupStep3Data;
  onChange: (next: SetupStep3Data) => void;
}

export function SetupStep3Crew({ data, onChange }: Props) {
  const licId = useId();
  const expId = useId();
  const costId = useId();
  const chargeId = useId();
  const activeId = useId();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1B2B4B]">{t("tradieSetup.teamTitle")}</h2>
      <p className="text-xs text-slate-500">{t("tradieWeb.setupNoCrewYet")}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={licId}>{t("tradieSetup.licenseNumberLabel")}</FormLabel>
          <input id={licId} autoFocus value={data.tradeLicenseNumber} onChange={(e) => onChange({ ...data, tradeLicenseNumber: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={expId}>{t("tradieSetup.licenseExpiryLabel")}</FormLabel>
          <input id={expId} type="date" value={data.licenseExpiryDate} onChange={(e) => onChange({ ...data, licenseExpiryDate: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={costId}>{t("tradieSetup.internalCostRateLabel")}</FormLabel>
          <input id={costId} value={data.internalHourlyCostRate} onChange={(e) => onChange({ ...data, internalHourlyCostRate: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={chargeId}>{t("tradieSetup.chargeOutRateLabel")}</FormLabel>
          <input id={chargeId} value={data.defaultChargeOutRate} onChange={(e) => onChange({ ...data, defaultChargeOutRate: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
      </div>
      <label htmlFor={activeId} className="flex items-center gap-2.5 text-sm font-medium text-slate-700 cursor-pointer pt-1">
        <input id={activeId} type="checkbox" checked={data.isFieldActive} onChange={(e) => onChange({ ...data, isFieldActive: e.target.checked })} className="w-4 h-4 rounded text-[#2563eb]" />
        {t("tradieSetup.fieldActiveLabel")}
      </label>
    </div>
  );
}
