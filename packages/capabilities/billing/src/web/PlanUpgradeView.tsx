"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Badge, Button } from "@kaesava/ui/web";
import type { PlanKey, SubscriptionStatusDto } from "@kaesava/types";

export interface PlanUpgradeViewProps {
  status?: SubscriptionStatusDto | null;
  foundingAvailable?: boolean;
  displayPrices?: { monthly?: string; annual?: string; foundingAnnual?: string };
  isCheckingOut?: boolean;
  onSelectPlan: (planType: PlanKey) => void;
  onManagePortal?: () => void;
  onBack?: () => void;
}

const INCLUDED_FEATURES = [
  "subscription.featureHistoryPaid",
  "subscription.featureGoalsPaid",
  "subscription.featureCsvImportPaid",
  "subscription.featureFileNotesPaid",
  "subscription.featureNotifications",
] as const;

export function PlanUpgradeView({
  status,
  foundingAvailable = false,
  displayPrices,
  isCheckingOut = false,
  onSelectPlan,
  onManagePortal,
  onBack,
}: PlanUpgradeViewProps) {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const annualPrice = displayPrices?.annual ?? "79";
  const foundingPrice = displayPrices?.foundingAnnual ?? "49";
  const monthlyPrice = displayPrices?.monthly ?? "8.50";

  if (status?.isSubscribed && onManagePortal) {
    return (
      <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("subscription.alreadySubscribedTitle")}</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("subscription.alreadySubscribedSubtitle")}</p>
        <div className="flex gap-3">
          <Button type="button" variant="primary" onClick={onManagePortal}>{t("subscription.manageSubscription")}</Button>
          {onBack && <Button type="button" variant="secondary" onClick={onBack}>{t("subscription.backToDashboard")}</Button>}
        </div>
      </div>
    );
  }

  const targetPlan: PlanKey = billingCycle === "monthly" ? "monthly" : foundingAvailable ? "founding" : "annual";
  const ctaLabel =
    targetPlan === "founding"
      ? t("subscription.claimFoundingRate", { amount: foundingPrice })
      : targetPlan === "annual"
        ? t("subscription.subscribeAnnualCta", { amount: annualPrice })
        : t("subscription.subscribeMonthlyCta", { amount: monthlyPrice });

  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{t("subscription.upgradePageTitle")}</h2>
          <Badge variant="primary">{t("subscription.annualDiscountBadge")}</Badge>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("subscription.upgradePageSubtitle")}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant={billingCycle === "annual" ? "primary" : "secondary"} size="sm" onClick={() => setBillingCycle("annual")}>
          {foundingAvailable ? t("subscription.annualTabFounding", { amount: foundingPrice }) : t("subscription.annualTabStandard", { amount: annualPrice })}
        </Button>
        <Button type="button" variant={billingCycle === "monthly" ? "primary" : "secondary"} size="sm" onClick={() => setBillingCycle("monthly")}>
          {t("subscription.monthlyTab", { amount: monthlyPrice })}
        </Button>
      </div>
      <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
        {INCLUDED_FEATURES.map((key) => (
          <li key={key} className="flex items-center gap-2">
            <span className="text-emerald-600">✓</span>
            <span>{t(key)}</span>
          </li>
        ))}
      </ul>
      <Button type="button" variant="primary" className="w-full" loading={isCheckingOut} onClick={() => onSelectPlan(targetPlan)}>
        {ctaLabel}
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("subscription.autoRenewalNote")}</p>
    </div>
  );
}
