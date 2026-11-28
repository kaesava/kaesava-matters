"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge, Button, fmtDate } from "@kaesava/ui/web";
import type { SubscriptionStatusDto } from "@kaesava/types";

export interface SubscriptionOverviewSectionProps {
  status?: SubscriptionStatusDto | null;
  isLoading?: boolean;
  isSyncing?: boolean;
  isOpeningPortal?: boolean;
  supportEmail?: string;
  onUpgrade: () => void;
  onManagePortal: () => void;
  onSync?: () => void;
}

function resolvePlanLabel(status: SubscriptionStatusDto): string {
  if (status.isSubscribed) {
    if (status.planType === "founding") return t("subscription.tierFounding");
    if (status.planType === "monthly") return t("subscription.tierMonthly");
    return t("subscription.tierAnnual");
  }
  if (status.isPastDue) return t("subscription.tierPastDue");
  if (status.isTrialActive) return t("subscription.tierTrial", { days: String(status.daysRemainingInTrial ?? 0) });
  return t("subscription.tierExpired");
}

export function SubscriptionOverviewSection({
  status,
  isLoading,
  isSyncing,
  isOpeningPortal,
  supportEmail,
  onUpgrade,
  onManagePortal,
  onSync,
}: SubscriptionOverviewSectionProps) {
  if (isLoading || !status) return null;

  const badgeVariant = status.isSubscribed
    ? status.cancelAtPeriodEnd
      ? "warning"
      : "success"
    : status.isPastDue
      ? "warning"
      : "primary";

  const badgeText = status.isSubscribed
    ? status.cancelAtPeriodEnd
      ? t("subscription.cancelingBadge")
      : t("subscription.activeBadge")
    : status.isTrialActive
      ? t("subscription.trialBadge")
      : t("subscription.upgradeBadge");

  const renewDate = status.nextBillingAt || status.subscriptionEndsAt;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t("subscription.currentSubscription")}
            </h3>
            <Badge variant={badgeVariant}>{badgeText}</Badge>
          </div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {resolvePlanLabel(status)}
          </p>
          {renewDate && status.isSubscribed && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {status.cancelAtPeriodEnd
                ? t("subscription.cancelingNotice", { date: fmtDate(renewDate) })
                : t("subscription.renewsOn", { date: fmtDate(renewDate) })}
            </p>
          )}
        </div>
        {onSync && (
          <Button type="button" variant="ghost" size="sm" onClick={onSync} loading={isSyncing} title={t("subscription.refreshTooltip")}>
            ↻
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{t("subscription.billingDesc")}</p>
      <div className="flex flex-wrap items-center gap-3">
        {status.isSubscribed ? (
          <Button type="button" variant="primary" onClick={onManagePortal} loading={isOpeningPortal}>
            {status.cancelAtPeriodEnd ? t("subscription.resumeSubscription") : t("subscription.manageSubscription")}
          </Button>
        ) : (
          <Button type="button" variant="primary" onClick={onUpgrade}>
            {t("subscription.upgradeCta")}
          </Button>
        )}
      </div>
      {supportEmail && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("subscription.supportHelpText", { email: supportEmail })}
        </p>
      )}
    </div>
  );
}
