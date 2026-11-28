"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Badge, Button } from "@kaesava/ui/web";
import type { PlanKey } from "@kaesava/types";

interface TradiePricingSectionProps {
  mode: "landing" | "upgrade";
  onSelectPlan?: (planType: PlanKey) => void;
  loading?: boolean;
}

export function TradiePricingSection({ mode, onSelectPlan, loading = false }: TradiePricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<"annual" | "monthly">("annual");
  const isFoundingActive = process.env.NEXT_PUBLIC_ENABLE_FOUNDING_OFFER !== "false";
  const periodLabel = billingCycle === "monthly" ? t("tradieWeb.pricingPerMonth") : t("tradieWeb.pricingPerYear");
  const soloAmount = billingCycle === "monthly" ? t("tradieWeb.pricingSoloMonthlyAmount") : t("tradieWeb.pricingSoloAnnualAmount");
  const crewStandard = billingCycle === "monthly" ? t("tradieWeb.pricingSmallCrewMonthlyAmount") : t("tradieWeb.pricingSmallCrewAnnualAmount");
  const soloPlan: PlanKey = billingCycle === "monthly" ? "solo_monthly" : "solo_annual";
  const crewPlan: PlanKey = isFoundingActive
    ? billingCycle === "monthly" ? "founding_crew_monthly" : "founding_crew_annual"
    : billingCycle === "monthly" ? "small_crew_monthly" : "small_crew_annual";

  const cards = [
    {
      key: "solo",
      badge: t("tradieWeb.pricingSoloBadge"),
      title: t("tradieWeb.pricingSoloTitle"),
      price: soloAmount,
      crossedOut: null as string | null,
      seat: t("tradieWeb.pricingSoloSeat"),
      note: null as string | null,
      featured: false,
      plan: soloPlan,
    },
    {
      key: "crew",
      badge: isFoundingActive ? t("tradieWeb.pricingFoundingBadge") : t("tradieWeb.pricingSmallCrewBadge"),
      title: t("tradieWeb.pricingSmallCrewTitle"),
      price: isFoundingActive ? soloAmount : crewStandard,
      crossedOut: isFoundingActive ? crewStandard : null,
      seat: t("tradieWeb.pricingSmallCrewSeat"),
      note: isFoundingActive ? t("tradieWeb.pricingFoundingNote") : null,
      featured: true,
      plan: crewPlan,
    },
  ];

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      <div className="text-center max-w-xl space-y-2">
        <Badge variant="primary">{t("tradieWeb.pricingTrialPill")}</Badge>
        <h2 className="text-3xl font-extrabold tracking-tight text-[#1B2B4B]">{t("tradieWeb.pricingTitle")}</h2>
        <p className="text-slate-600 text-sm leading-relaxed">{t("tradieWeb.pricingSubtitle")}</p>
        <div className="inline-flex items-center gap-1.5 bg-slate-200/80 p-1.5 rounded-2xl mt-3 border border-slate-300/50">
          {(["annual", "monthly"] as const).map((cycle) => (
            <button key={cycle} type="button" onClick={() => setBillingCycle(cycle)} className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${billingCycle === cycle ? "bg-[#2563eb] text-white shadow-sm" : "text-slate-700 hover:text-slate-900"}`}>
              {cycle === "annual" ? t("tradieWeb.pricingToggleAnnual") : t("tradieWeb.pricingToggleMonthly")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 w-full max-w-4xl mx-auto">
        {cards.map((card) => (
          <div key={card.key} className={`bg-white rounded-3xl p-7 flex flex-col justify-between gap-5 ${card.featured ? "border-2 border-[#2563eb] shadow-xl" : "border border-slate-200 shadow-sm"}`}>
            <div className="space-y-3">
              <span className="inline-block text-[10px] font-black uppercase tracking-widest text-[#2563eb] bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">{card.badge}</span>
              <h3 className="text-xl font-black text-[#1B2B4B]">{card.title}</h3>
              <div className="flex items-baseline gap-2 font-mono">
                {card.crossedOut && <span className="line-through text-slate-400 text-xl font-bold">{card.crossedOut}</span>}
                <span className="text-3xl font-black text-[#1B2B4B]">{card.price}</span>
                <span className="text-xs font-sans text-slate-500 font-semibold">{periodLabel}</span>
              </div>
              {card.note && <p className="text-xs font-semibold text-[#2563eb]">{card.note}</p>}
              <p className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">{card.seat}</p>
              <ul className="flex flex-col gap-2 text-xs text-slate-700 font-semibold pt-1">
                <li>✓ {t("tradieWeb.pricingFeature1")}</li>
                <li>✓ {t("tradieWeb.pricingFeature2")}</li>
                <li>✓ {t("tradieWeb.pricingFeature3")}</li>
                <li>✓ {t("tradieWeb.pricingFeature4")}</li>
                <li>✓ {t("tradieWeb.pricingFeature5")}</li>
              </ul>
            </div>
            {mode === "landing" ? (
              <Link href="/sign-up" className="w-full bg-[#2563eb] hover:bg-blue-700 text-white font-black py-3.5 rounded-2xl shadow-sm text-sm transition-all text-center block">
                {t("tradieWeb.heroCtaPrimary")}
              </Link>
            ) : (
              <Button type="button" loading={loading} onClick={() => onSelectPlan?.(card.plan)} className="w-full">
                {t("tradieWeb.subscriptionSelectTier", { tier: card.title })}
              </Button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 font-medium text-center">{t("tradieWeb.pricingCancelNote")}</p>
    </div>
  );
}
