"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import {
  AbnInput,
  AmountField,
  Badge,
  Button,
  FormLabel,
  GenericSelectField,
  InfoTooltip,
  Input,
  useToast,
} from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { useLocale } from "../../../../providers/LocaleProvider";
import { AccountingSyncSection } from "./AccountingSyncSection";
import { CommsSettingsSection } from "./CommsSettingsSection";

const PAYID_TYPES = [
  { value: "", label: t("tradieWeb.payIdTypeNone") },
  { value: "ABN", label: t("tradieWeb.payIdTypeAbn") },
  { value: "EMAIL", label: t("tradieWeb.payIdTypeEmail") },
  { value: "PHONE", label: t("tradieWeb.payIdTypePhone") },
];

export function BusinessSettingsTab() {
  const { showToast } = useToast();
  const { fmt } = useLocale();
  const utils = trpc.useUtils();
  const profileQuery = trpc.getBusinessProfile.useQuery();
  const teamQuery = trpc.listTeamMembersWithRates.useQuery();
  const updateProfile = trpc.updateBusinessProfile.useMutation({
    onSuccess: () => {
      void utils.getBusinessProfile.invalidate();
      showToast({ type: "success", message: t("tradieWeb.settingsSaved") });
    },
  });
  const startConnect = trpc.invoices.createConnectOnboardingLink.useMutation();

  const p = profileQuery.data;
  const [businessNameDraft, setBusinessName] = useState<string | null>(null);
  const [tradeTypeDraft, setTradeType] = useState<string | null>(null);
  const [abnDraft, setAbn] = useState<string | null>(null);
  const [gstRegisteredDraft, setGstRegistered] = useState<boolean | null>(null);
  const [payIdTypeDraft, setPayIdType] = useState<string | null>(null);
  const [payIdValueDraft, setPayIdValue] = useState<string | null>(null);
  const [callOutFeeDraft, setCallOutFee] = useState<string | null>(null);
  const [markupPctDraft, setMarkupPct] = useState<string | null>(null);
  const [targetMarginPctDraft, setTargetMarginPct] = useState<string | null>(null);
  const [superRatePctDraft, setSuperRatePct] = useState<string | null>(null);
  const [maxCardThresholdDraft, setMaxCardThreshold] = useState<string | null>(null);

  const businessName = businessNameDraft ?? p?.businessName ?? "";
  const tradeType = tradeTypeDraft ?? p?.tradeType ?? "GENERAL";
  const abn = abnDraft ?? p?.abn ?? "";
  const gstRegistered = gstRegisteredDraft ?? p?.gstRegistered ?? true;
  const payIdType = payIdTypeDraft ?? (p as { payIdType?: string | null } | undefined)?.payIdType ?? "";
  const payIdValue = payIdValueDraft ?? (p as { payIdValue?: string | null } | undefined)?.payIdValue ?? "";
  const callOutFee = callOutFeeDraft ?? String((p as { defaultCallOutFee?: number | null } | undefined)?.defaultCallOutFee ?? "");
  const markupPct = markupPctDraft ?? String((p as { defaultMarkupPct?: number | null } | undefined)?.defaultMarkupPct ?? "20");
  const targetMarginPct = targetMarginPctDraft ?? String((p as { targetMarginPct?: number | null } | undefined)?.targetMarginPct ?? "30");
  const superRatePct = superRatePctDraft ?? String((p as { superRatePct?: number | null } | undefined)?.superRatePct ?? "12");
  const maxCardThreshold = maxCardThresholdDraft ?? String((p as { maxCardThreshold?: number | null } | undefined)?.maxCardThreshold ?? "");

  const nameId = useId();
  const tradeId = useId();
  const gstId = useId();
  const payIdValId = useId();
  const markupId = useId();
  const marginId = useId();
  const superId = useId();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile.mutate({
      businessName: businessName.trim() || undefined,
      tradeType: tradeType.trim() || undefined,
      abn: abn.trim() || null,
      gstRegistered,
      payIdType: payIdType || null,
      payIdValue: payIdValue.trim() || null,
      defaultCallOutFee: callOutFee ? Number(callOutFee) : null,
      defaultMarkupPct: markupPct ? Number(markupPct) : null,
      targetMarginPct: targetMarginPct ? Number(targetMarginPct) : null,
      superRatePct: superRatePct ? Number(superRatePct) : null,
      maxCardThreshold: maxCardThreshold ? Number(maxCardThreshold) : null,
    } as Parameters<typeof updateProfile.mutate>[0]);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSave} className="ui-card p-6 space-y-5">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("tradieWeb.setupStep1Title")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FormLabel htmlFor={nameId}>{t("tradieSetup.businessNameLabel")}</FormLabel>
            <Input id={nameId} value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
          </div>
          <div>
            <FormLabel htmlFor={tradeId}>{t("tradieSetup.tradeTypeLabel")}</FormLabel>
            <Input id={tradeId} value={tradeType} onChange={(e) => setTradeType(e.target.value)} />
          </div>
          <div>
            <AbnInput label={t("tradieSetup.abnLabel")} value={abn} onChange={setAbn} />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input id={gstId} type="checkbox" checked={gstRegistered} onChange={(e) => setGstRegistered(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
            <label htmlFor={gstId} className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("tradieSetup.gstRegisteredLabel")}</label>
            <InfoTooltip content={t("tradieWeb.gstModeTooltip")} />
          </div>
          <div>
            <GenericSelectField
              label={t("tradieWeb.payIdTypeLabel")}
              value={payIdType}
              onChange={setPayIdType}
              options={PAYID_TYPES}
            />
          </div>
          <div>
            <FormLabel htmlFor={payIdValId}>{t("tradieWeb.payIdValueLabel")}</FormLabel>
            <Input id={payIdValId} value={payIdValue} onChange={(e) => setPayIdValue(e.target.value)} placeholder={t("tradieWeb.payIdPlaceholder")} />
          </div>
          <div>
            <AmountField label={t("tradieWeb.callOutFeeLabel")} value={callOutFee} onChange={setCallOutFee} />
          </div>
          <div>
            <FormLabel htmlFor={markupId}>{t("tradieWeb.defaultMarkupPctLabel")}</FormLabel>
            <Input id={markupId} type="number" step="0.5" value={markupPct} onChange={(e) => setMarkupPct(e.target.value)} />
          </div>
          <div>
            <FormLabel htmlFor={marginId}>{t("tradieWeb.targetMarginPctLabel")}</FormLabel>
            <Input id={marginId} type="number" step="0.5" value={targetMarginPct} onChange={(e) => setTargetMarginPct(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <FormLabel htmlFor={superId}>{t("tradieWeb.paydaySuperPctLabel")}</FormLabel>
              <InfoTooltip content={t("tradieWeb.paydaySuperTooltip")} />
            </div>
            <Input id={superId} type="number" step="0.5" value={superRatePct} onChange={(e) => setSuperRatePct(e.target.value)} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <FormLabel>{t("tradieWeb.maxCardThresholdLabel")}</FormLabel>
              <InfoTooltip content={t("tradieWeb.maxCardThresholdTooltip")} />
            </div>
            <AmountField value={maxCardThreshold} onChange={setMaxCardThreshold} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={updateProfile.isPending}>{t("common.save")}</Button>
        </div>
      </form>

      <div className="ui-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("tradieWeb.stripeConnectTitle")}</h3>
          <p className="text-sm text-slate-500 mt-0.5">{t("tradieWeb.stripeConnectDesc")}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          loading={startConnect.isPending}
          onClick={async () => {
            const res = await startConnect.mutateAsync({ returnUrl: window.location.href, refreshUrl: window.location.href });
            if (res?.url) window.location.href = res.url;
          }}
        >
          {t("tradieWeb.stripeConnectCta")}
        </Button>
      </div>

      <div className="ui-card p-6 space-y-3">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t("tradieWeb.crewRatesTitle")}</h3>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {(teamQuery.data ?? []).map((member) => (
            <div key={member.userId} className="py-2.5 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100">{member.displayName}</p>
                <p className="text-xs text-slate-500">{member.isFieldActive ? t("tradieWeb.fieldActiveBadge") : t("tradieWeb.officeOnlyBadge")}</p>
              </div>
              <Badge variant="primary">
                <span className="font-mono tabular-nums">{fmt(Number(member.internalHourlyCostRate ?? 0))}/hr</span>
              </Badge>
            </div>
          ))}
        </div>
      </div>

      <AccountingSyncSection />
      <CommsSettingsSection />
    </div>
  );
}
