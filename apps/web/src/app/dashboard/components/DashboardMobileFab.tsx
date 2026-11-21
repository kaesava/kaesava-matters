"use client";

import React from "react";
import { Plus } from "lucide-react";
import { t } from "@money-matters/i18n";

export interface DashboardMobileFabProps {
  onClick: () => void;
}

/**
 * Mobile-only floating Quick Action trigger in the bottom-right thumb zone.
 */
export function DashboardMobileFab({ onClick }: DashboardMobileFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("dashboard.quickAction")}
      title={t("dashboard.quickAction")}
      className="md:hidden fixed bottom-5 right-4 z-40 w-14 h-14 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white shadow-lg shadow-blue-900/25 flex items-center justify-center transition-all cursor-pointer mb-[env(safe-area-inset-bottom)]"
    >
      <Plus className="w-6 h-6 stroke-[2.5]" />
    </button>
  );
}
