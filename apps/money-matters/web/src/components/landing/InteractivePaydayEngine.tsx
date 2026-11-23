"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { ModalDialog, useToast } from "@kaesava/ui/web";
import { useLocale } from "../../providers/LocaleProvider";
import {
  computeLandingPaydaySplit,
  type LandingPresetKey,
} from "./landingSimulatorLogic";
import { LandingAffordSimulatorTab } from "./LandingAffordSimulatorTab";

export interface InteractivePaydayEngineProps {
  onAuthClick: (tab: "signIn" | "signUp") => void;
}

type EnvelopeKey = "bills" | "everyday" | "goals" | "surplus";

const PRESET_OPTIONS: ReadonlyArray<{ key: LandingPresetKey; labelKey: "landing.calcPresetBalanced" | "landing.calcPresetBillsFortress" | "landing.calcPresetPayYourselfFirst" }> = [
  { key: "BALANCED", labelKey: "landing.calcPresetBalanced" },
  { key: "BILLS_FORTRESS", labelKey: "landing.calcPresetBillsFortress" },
  { key: "PAY_YOURSELF_FIRST", labelKey: "landing.calcPresetPayYourselfFirst" },
];

export function InteractivePaydayEngine({ onAuthClick }: InteractivePaydayEngineProps) {
  const { currencySymbol } = useLocale();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"waterfall" | "afford">("waterfall");
  const [netIncome, setNetIncome] = useState<number>(2800);
  const [cadence, setCadence] = useState<"weekly" | "fortnightly" | "monthly">("fortnightly");
  const [preset, setPreset] = useState<LandingPresetKey>("BALANCED");
  const [adjustments, setAdjustments] = useState<Record<EnvelopeKey, number>>({
    bills: 0,
    everyday: 0,
    goals: 0,
    surplus: 0,
  });

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFrom, setTransferFrom] = useState<EnvelopeKey>("everyday");
  const [transferTo, setTransferTo] = useState<EnvelopeKey>("goals");
  const [transferAmount, setTransferAmount] = useState<string>("50");

  const baseSplit = computeLandingPaydaySplit(netIncome, cadence, preset);
  const billsTarget = Math.max(0, baseSplit.bills.amount + adjustments.bills);
  const everydayTarget = Math.max(0, baseSplit.everyday.amount + adjustments.everyday);
  const goalsTarget = Math.max(0, baseSplit.goals.amount + adjustments.goals);
  const surplusOffset = Math.max(0, baseSplit.surplus + adjustments.surplus);

  const statusBadge = (status: "FUNDED" | "PARTIAL" | "GAP", fundedText: string) => {
    if (status === "FUNDED") {
      return {
        label: fundedText,
        cls: "text-emerald-800 bg-emerald-50 border-emerald-200",
      };
    }
    if (status === "PARTIAL") {
      return {
        label: t("landing.simStatusPartial"),
        cls: "text-amber-800 bg-amber-50 border-amber-200",
      };
    }
    return {
      label: t("landing.simStatusGap"),
      cls: "text-rose-800 bg-rose-50 border-rose-200",
    };
  };

  const billsBadge = statusBadge(baseSplit.bills.status, t("landing.protectedOnPayday"));
  const everydayBadge = statusBadge(baseSplit.everyday.status, t("landing.spendFreelyNoGuilt"));
  const goalsBadge = statusBadge(baseSplit.goals.status, t("landing.automaticGoalGrowth"));

  const stepOrder: ReadonlyArray<Exclude<EnvelopeKey, "surplus">> =
    preset === "PAY_YOURSELF_FIRST"
      ? ["bills", "goals", "everyday"]
      : ["bills", "everyday", "goals"];

  const stepBadges = [
    t("landing.step1Badge"),
    t("landing.step2Badge"),
    t("landing.step3Badge"),
  ] as const;

  const cardConfig: Record<
    Exclude<EnvelopeKey, "surplus">,
    {
      borderCls: string;
      badgeCls: string;
      transferHoverCls: string;
      amountCls: string;
      title: string;
      amount: number;
      subtitle: string;
      status: { label: string; cls: string };
    }
  > = {
    bills: {
      borderCls: "border border-blue-200/90",
      badgeCls: "text-blue-700 bg-blue-100",
      transferHoverCls: "hover:text-[#2563eb]",
      amountCls: "text-[#2563eb]",
      title: t("landing.heroBentoBillsTitle"),
      amount: billsTarget,
      subtitle: t("landing.heroBentoBillsDue"),
      status: billsBadge,
    },
    everyday: {
      borderCls: "border-2 border-[#22c55e]",
      badgeCls: "text-emerald-800 bg-emerald-100",
      transferHoverCls: "hover:text-[#22c55e]",
      amountCls: "text-[#22c55e]",
      title: t("landing.heroBentoEverydayTitle"),
      amount: everydayTarget,
      subtitle: t("landing.heroBentoEverydaySubtitle"),
      status: everydayBadge,
    },
    goals: {
      borderCls: "border border-indigo-200/90",
      badgeCls: "text-indigo-700 bg-indigo-100",
      transferHoverCls: "hover:text-indigo-600",
      amountCls: "text-indigo-700",
      title: t("landing.heroBentoGoalsTitle"),
      amount: goalsTarget,
      subtitle: t("landing.heroBentoGoalsSubtitle"),
      status: goalsBadge,
    },
  };

  const resetAdjustments = () => setAdjustments({ bills: 0, everyday: 0, goals: 0, surplus: 0 });

  const handleCadenceChange = (nextCadence: "weekly" | "fortnightly" | "monthly") => {
    if (nextCadence === cadence) return;
    const perYear =
      cadence === "weekly" ? netIncome * 52 : cadence === "fortnightly" ? netIncome * 26 : netIncome * 12;
    const nextPay =
      nextCadence === "weekly"
        ? Math.round(perYear / 52 / 100) * 100
        : nextCadence === "fortnightly"
          ? Math.round(perYear / 26 / 100) * 100
          : Math.round(perYear / 12 / 100) * 100;
    setCadence(nextCadence);
    setNetIncome(Math.min(6000, Math.max(1200, nextPay)));
    resetAdjustments();
  };

  const openTransfer = (from: EnvelopeKey) => {
    setTransferFrom(from);
    setTransferTo(from === "goals" ? "everyday" : "goals");
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = () => {
    const amt = Math.round(parseFloat(transferAmount) || 0);
    if (amt > 0 && transferFrom !== transferTo) {
      setAdjustments((prev) => ({
        ...prev,
        [transferFrom]: prev[transferFrom] - amt,
        [transferTo]: prev[transferTo] + amt,
      }));
      toast.success(t("landing.simTransferApplied"));
    }
    setIsTransferModalOpen(false);
  };

  return (
    <section
      id="simulator"
      className="bg-white border-y border-slate-200/90 py-20 scroll-mt-14"
      aria-label="Interactive Payday Engine"
    >
      <div className="max-w-6xl mx-auto px-6 flex flex-col gap-10">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-bold text-[#2563eb] tracking-wider uppercase shadow-2xs">
            {t("landing.calcBadge")}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#1B2B4B]">
            {t("landing.calcTitle")}
          </h2>
          <p className="text-slate-600 leading-relaxed text-sm sm:text-base font-medium">
            {t("landing.calcSubtitle")}
          </p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setActiveTab("waterfall")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "waterfall"
                  ? "bg-white text-[#1B2B4B] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.calcTabWaterfall")}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("afford")}
              className={`px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === "afford"
                  ? "bg-white text-[#1B2B4B] shadow-2xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {t("landing.calcTabAfford")}
            </button>
          </div>
        </div>

        {activeTab === "waterfall" ? (
          <div className="space-y-8">
            <div className="p-6 rounded-3xl bg-[#F7F8FA] border border-slate-200/80 space-y-5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-2 w-full md:w-1/2">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs font-black text-[#1B2B4B] uppercase tracking-wider">
                      {t("landing.calcNetIncomeLabel")}
                    </label>
                    <span className="text-xl font-black font-mono text-[#2563eb] tabular-nums">
                      {currencySymbol}{netIncome.toLocaleString()}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1200"
                    max="6000"
                    step="100"
                    value={netIncome}
                    onChange={(e) => {
                      setNetIncome(Number(e.target.value));
                      resetAdjustments();
                    }}
                    className="w-full accent-[#2563eb] cursor-pointer"
                  />
                  <div className="flex gap-2 pt-1">
                    {[1800, 2500, 3200, 4500].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setNetIncome(val);
                          resetAdjustments();
                        }}
                        className={`text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg border cursor-pointer transition-colors ${
                          netIncome === val
                            ? "bg-[#2563eb] text-white border-[#2563eb]"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {currencySymbol}{val}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 w-full md:w-auto">
                  <label className="text-xs font-black text-[#1B2B4B] uppercase tracking-wider block">
                    {t("landing.calcCadenceLabel")}
                  </label>
                  <div className="inline-flex p-1 bg-white rounded-xl border border-slate-200">
                    {(
                      [
                        { key: "weekly", label: t("forms.weekly") },
                        { key: "fortnightly", label: t("forms.fortnightly") },
                        { key: "monthly", label: t("forms.monthly") },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleCadenceChange(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          cadence === opt.key
                            ? "bg-[#1B2B4B] text-white"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Compact 3-Preset Strategy Selector */}
              <div className="pt-4 border-t border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-black text-[#1B2B4B] uppercase tracking-wider mr-1">
                    {t("landing.calcPresetLabel")}:
                  </span>
                  {PRESET_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setPreset(opt.key);
                        resetAdjustments();
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        preset === opt.key
                          ? "bg-[#2563eb] text-white border-[#2563eb] shadow-2xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-500 font-medium">
                  {t("landing.calcPresetCustomNote")}
                </span>
              </div>
            </div>

            {/* 4-Envelope Allocation Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {stepOrder.map((key, idx) => {
                const cfg = cardConfig[key];
                return (
                  <div
                    key={key}
                    className={`p-5 rounded-2xl bg-white ${cfg.borderCls} shadow-2xs flex flex-col justify-between gap-4 transition-all duration-300`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold font-mono ${cfg.badgeCls} px-2 py-0.5 rounded-md`}>
                          {stepBadges[idx]}
                        </span>
                        <span className="text-xs font-black text-[#1B2B4B]">
                          {cfg.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openTransfer(key)}
                        className={`text-[10px] font-bold text-slate-400 ${cfg.transferHoverCls} cursor-pointer`}
                      >
                        ⇄ {t("common.transfer")}
                      </button>
                    </div>
                    <div>
                      <div className={`text-2xl font-black font-mono ${cfg.amountCls} tabular-nums`}>
                        {currencySymbol}{cfg.amount.toLocaleString()}
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium mt-1">
                        {cfg.subtitle}
                      </p>
                    </div>
                    <div className={`text-[11px] font-bold p-2 rounded-xl border ${cfg.status.cls}`}>
                      {cfg.status.label}
                    </div>
                  </div>
                );
              })}

              <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between gap-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      {t("landing.step4Badge")}
                    </span>
                    <span className="text-xs font-black text-[#1B2B4B]">
                      {t("landing.waterfallStep4")}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openTransfer("surplus")}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    ⇄ {t("common.transfer")}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-slate-800 tabular-nums">
                    +{currencySymbol}{surplusOffset.toLocaleString()}
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium mt-1">
                    {t("landing.surplusOffset")}
                  </p>
                </div>
                <div className="text-[11px] font-bold text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-200">
                  {t("landing.reducesMortgageInterest")}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <LandingAffordSimulatorTab
            currencySymbol={currencySymbol}
            netIncome={netIncome}
            everydayTarget={everydayTarget}
            goalsTarget={goalsTarget}
          />
        )}

        <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="space-y-0.5">
            <div className="text-sm font-black text-[#1B2B4B]">
              {t("landing.calcCtaPrompt")}
            </div>
            <div className="text-xs text-slate-600 font-medium">
              {t("landing.calcCtaSubtitle")}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onAuthClick("signUp")}
            className="bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black px-6 py-3.5 rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer shrink-0"
          >
            {t("landing.calcCtaBtn")}
          </button>
        </div>
      </div>

      <ModalDialog
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={t("landing.simTransferModalTitle")}
        isDirty={false}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-slate-500">
            {t("landing.simTransferSubtitle")}
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {t("landing.simTransferSource")}
            </label>
            <input
              type="text"
              readOnly
              value={transferFrom.toUpperCase()}
              className="w-full px-3 py-2 bg-slate-100 rounded-lg text-xs font-mono font-bold text-slate-700 border border-slate-200"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {t("landing.simTransferDestination")}
            </label>
            <select
              value={transferTo}
              onChange={(e) => setTransferTo(e.target.value as EnvelopeKey)}
              className="w-full px-3 py-2 bg-white rounded-lg text-xs font-mono font-bold text-slate-900 border border-slate-300"
            >
              {(["bills", "everyday", "goals", "surplus"] as const)
                .filter((k) => k !== transferFrom)
                .map((k) => (
                  <option key={k} value={k}>
                    {k.toUpperCase()}
                  </option>
                ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">
              {t("landing.simTransferAmount")}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-mono font-bold text-slate-400">
                {currencySymbol}
              </span>
              <input
                type="number"
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-2 bg-white rounded-lg text-xs font-mono font-bold text-slate-900 border border-slate-300"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {t("common.cancel")}
            </button>
            <button
              type="button"
              onClick={handleConfirmTransfer}
              className="px-4 py-2 text-xs font-bold text-white bg-[#2563eb] hover:bg-blue-700 rounded-lg cursor-pointer"
            >
              {t("landing.simTransferConfirm")}
            </button>
          </div>
        </div>
      </ModalDialog>
    </section>
  );
}
