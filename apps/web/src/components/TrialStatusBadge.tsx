"use client";

import { useSubscriptionStatus } from "../hooks/useSubscriptionStatus";
import { t } from "@money-matters/i18n";

export function SidebarTrialNavItem({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { status, isLoading } = useSubscriptionStatus();

  if (isLoading || !status || status.isSubscribed) return null;

  const days = status.daysRemainingInTrial ?? 60;
  const isUrgent = days <= 7;

  const label = status.isTrialExpired
    ? t("subscription.trialExpired")
    : t("subscription.trialDaysLeftBadge", { days: String(days) });

  const fullLabel = status.isTrialExpired
    ? t("subscription.trialExpired")
    : t("subscription.tierTrial", { days: String(days) });

  const actionText = t("subscription.upgradeBadge");

  const badgeColor =
    isUrgent || status.isTrialExpired
      ? "bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30"
      : "bg-blue-500/20 text-blue-200 border-blue-400/30 hover:bg-blue-500/30";

  return (
    <a
      href="/subscription/upgrade"
      onClick={() => {
        if (onNavigate) onNavigate();
      }}
      title={collapsed ? `${fullLabel} — ${actionText}` : fullLabel}
      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 group relative border ${badgeColor} cursor-pointer ${
        collapsed ? "justify-center" : "justify-between"
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm shrink-0">✨</span>
        {!collapsed && <span className="text-white font-bold whitespace-nowrap">{label}</span>}
      </div>
      {!collapsed && (
        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/20 text-white shrink-0">
          {actionText}
        </span>
      )}
      {collapsed && (
        <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none shadow-xl border border-white/10">
          {fullLabel} — {actionText}
        </div>
      )}
    </a>
  );
}
