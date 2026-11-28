"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import type { SubscriptionStatusDto } from "@kaesava/types";

export interface TrialBannerProps {
  status?: SubscriptionStatusDto | null;
  isLoading?: boolean;
  onUpgrade: () => void;
}

export function TrialBanner({ status, isLoading, onUpgrade }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || !status || status.isSubscribed || dismissed) {
    return null;
  }

  const days = status.daysRemainingInTrial ?? 60;
  const showForTrial = status.isTrialActive && days <= 7;
  const showForPastDue = status.isPastDue;

  if (!showForTrial && !showForPastDue) {
    return null;
  }

  const message = status.isTrialActive
    ? t("subscription.bannerUrgent", { days: String(days) })
    : t("subscription.bannerPastDue");

  const bgClasses = status.isTrialActive
    ? days <= 3
      ? "bg-rose-700 text-white"
      : "bg-amber-600 text-white"
    : "bg-amber-700 text-white";

  return (
    <div className={`w-full py-2.5 px-4 flex items-center justify-between gap-4 text-xs md:text-sm font-medium shadow-sm ${bgClasses}`}>
      <div className="flex items-center gap-2">
        <span>⚡</span>
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUpgrade}
          className="bg-white text-zinc-900 hover:bg-zinc-100 font-semibold px-3 py-1 rounded-md text-xs transition-colors shadow-sm"
        >
          {t("subscription.upgradeCta")}
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="opacity-70 hover:opacity-100 p-1 text-xs"
          aria-label={t("common.close")}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
