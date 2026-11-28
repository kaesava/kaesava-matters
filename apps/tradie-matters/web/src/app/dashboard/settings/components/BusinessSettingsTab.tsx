"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { AccountingSyncSection } from "./AccountingSyncSection";
import { CommsSettingsSection } from "./CommsSettingsSection";

export function BusinessSettingsTab() {
  const { showToast } = useToast();
  const utils = trpc.useUtils();
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const teamQuery = trpc.listTeamMembersWithRates.useQuery();
  const updateProfile = trpc.updateBusinessProfile.useMutation({
    onSuccess: () => {
      void utils.getBusinessProfile.invalidate();
      showToast({ type: "success", message: t("tradieWeb.settingsSaved") });
    },
  });

  const [businessNameDraft, setBusinessName] = useState<string | null>(null);
  const [tradeTypeDraft, setTradeType] = useState<string | null>(null);
  const [abnDraft, setAbn] = useState<string | null>(null);
  const [gstRegisteredDraft, setGstRegistered] = useState<boolean | null>(null);
  const businessName = businessNameDraft ?? profileQuery.data?.businessName ?? "";
  const tradeType = tradeTypeDraft ?? profileQuery.data?.tradeType ?? "GENERAL";
  const abn = abnDraft ?? profileQuery.data?.abn ?? "";
  const gstRegistered = gstRegisteredDraft ?? profileQuery.data?.gstRegistered ?? true;
  const nameId = useId();
  const tradeId = useId();
  const abnId = useId();
  const gstId = useId();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      businessName: businessName.trim() || undefined,
      tradeType: tradeType.trim() || undefined,
      abn: abn.trim() || null,
      gstRegistered,
    });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="text-lg font-semibold text-[#1B2B4B]">{t("tradieWeb.setupStep1Title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor={nameId}>{t("tradieSetup.businessNameLabel")}</FormLabel>
            <input id={nameId} value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <FormLabel htmlFor={tradeId}>{t("tradieSetup.tradeTypeLabel")}</FormLabel>
            <input id={tradeId} value={tradeType} onChange={(e) => setTradeType(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
          </div>
          <div>
            <FormLabel htmlFor={abnId}>{t("tradieSetup.abnLabel")}</FormLabel>
            <input id={abnId} value={abn} onChange={(e) => setAbn(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" />
          </div>
          <label htmlFor={gstId} className="flex items-center gap-2 text-sm font-medium text-slate-700 pt-6 cursor-pointer">
            <input id={gstId} type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} className="w-4 h-4 rounded" />
            {t("tradieSetup.gstRegisteredLabel")}
          </label>
        </div>
        <Button type="submit" loading={updateProfile.isPending}>{t("tradieSetup.saveProfileAction")}</Button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <h2 className="text-lg font-semibold text-[#1B2B4B]">{t("tradieSetup.teamTitle")}</h2>
        <ul className="divide-y divide-slate-200">
          {(teamQuery.data ?? []).map((member) => (
            <li key={member.userId} className="py-3 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-slate-900">{member.displayName}</p>
                <p className="text-xs text-slate-500">{member.tradeLicenseNumber || "-"}</p>
              </div>
              <div className="text-right font-mono text-xs text-slate-600">
                <p>{member.defaultChargeOutRate || "-"}</p>
                <p className="text-slate-400">
                  {member.internalHourlyCostRate ?? t("tradieSetup.costRateRestricted")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
      <AccountingSyncSection />
      <CommsSettingsSection />
    </div>
  );
}
