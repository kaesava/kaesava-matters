"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import {
  computeLandingAffordVerdict,
  type LandingAffordFrequency,
  type LandingAffordMode,
  type LandingAffordVerdict,
} from "./landingSimulatorLogic";

export interface LandingAffordSimulatorTabProps {
  currencySymbol: string;
  netIncome: number;
  everydayTarget: number;
  goalsTarget: number;
}

function getVerdictClasses(status: LandingAffordVerdict["status"]): string {
  switch (status) {
    case "SAFE_YES":
      return "bg-emerald-50 border-emerald-200 text-emerald-950";
    case "PACING_TIGHT":
      return "bg-amber-50 border-amber-200 text-amber-950";
    case "BILLS_RISK":
    case "GOAL_DELAYED":
      return "bg-orange-50 border-orange-200 text-orange-950";
    case "WAIT_FOR_PAYCYCLE":
      return "bg-blue-50 border-blue-200 text-blue-950";
    case "HARD_NO":
      return "bg-rose-50 border-rose-200 text-rose-950";
  }
}

export function LandingAffordSimulatorTab({
  currencySymbol,
  netIncome,
  everydayTarget,
  goalsTarget,
}: LandingAffordSimulatorTabProps) {
  const [testAmount, setTestAmount] = useState<string>("180");
  const [mode, setMode] = useState<LandingAffordMode>("ONE_OFF");
  const [frequency, setFrequency] = useState<LandingAffordFrequency>("MONTHLY");
  const [verdict, setVerdict] = useState<LandingAffordVerdict | null>(null);

  const handleRunAffordTest = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(testAmount) || 0;
    if (amount <= 0) return;

    setVerdict(
      computeLandingAffordVerdict({
        amount,
        mode,
        frequency,
        netIncome,
        everydayTarget,
        goalsTarget,
      })
    );
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-8 rounded-3xl bg-[#F7F8FA] border border-slate-200/80 shadow-sm space-y-6">
      <div className="space-y-1 text-center">
        <h3 className="text-xl font-black text-[#1B2B4B]">
          {t("landing.heroBentoSimTitle")}
        </h3>
        <p className="text-xs text-slate-500 font-medium">
          {t("landing.affordSimSubtitle", {
            currencySymbol,
            amount: everydayTarget.toLocaleString(),
          })}
        </p>
      </div>

      <form onSubmit={handleRunAffordTest} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            {t("landing.affordAmountLabel")}
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-400 font-mono">
              {currencySymbol}
            </span>
            <input
              type="number"
              value={testAmount}
              onChange={(e) => setTestAmount(e.target.value)}
              placeholder="180"
              className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-300 font-mono font-bold text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">
            {t("landing.affordModeLabel")}
          </label>
          <div className="grid grid-cols-2 gap-2 p-1 bg-white rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setMode("ONE_OFF");
                setVerdict(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "ONE_OFF"
                  ? "bg-[#1B2B4B] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("landing.affordModeOneOff")}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("RECURRING");
                setVerdict(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                mode === "RECURRING"
                  ? "bg-[#1B2B4B] text-white"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("landing.affordModeRecurring")}
            </button>
          </div>
        </div>

        {mode === "RECURRING" && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              {t("landing.affordFrequencyLabel")}
            </label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as LandingAffordFrequency)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
            >
              <option value="WEEKLY">{t("forms.weekly")}</option>
              <option value="FORTNIGHTLY">{t("forms.fortnightly")}</option>
              <option value="MONTHLY">{t("forms.monthly")}</option>
              <option value="ANNUALLY">{t("forms.annually")}</option>
            </select>
          </div>
        )}

        <button
          type="submit"
          className="w-full py-3 bg-[#1B2B4B] hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
        >
          {t("landing.affordTestBtn")}
        </button>
      </form>

      {verdict && (
        <div
          className={`p-4 rounded-2xl border space-y-1 ${getVerdictClasses(verdict.status)}`}
        >
          <div className="font-extrabold text-sm flex items-center gap-2">
            <span>{verdict.title}</span>
          </div>
          <p className="text-xs leading-relaxed opacity-90">{verdict.desc}</p>
        </div>
      )}
    </div>
  );
}
