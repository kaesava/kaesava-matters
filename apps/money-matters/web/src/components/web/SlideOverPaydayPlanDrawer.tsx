"use client";

import { useMemo } from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { SlideOverDrawer, Button } from "@kaesava/ui/web";
import { useLocale } from "../../providers/LocaleProvider";

export interface PaydayPlanLineRecord {
  planId: string;
  categoryId?: string | null;
  poolId?: string | null;
  proposedAmount: string;
  confirmedAmount: string | null;
  reasoning: string | null;
  poolName?: string | null;
  categoryName?: string | null;
}

export interface PaydayPlanRecord {
  id: string;
  totalIncomeAmount: string;
  status: string | null;
  createdAt: string | Date;
  expectedDate?: string | null;
  incomeDate?: string | null;
  incomeName?: string | null;
  receivingAccountId?: string | null;
  receivingAccountName?: string | null;
  note?: string | null;
  lines: PaydayPlanLineRecord[];
}

interface SlideOverPaydayPlanDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PaydayPlanRecord | null;
}

export function SlideOverPaydayPlanDrawer({
  isOpen,
  onClose,
  plan,
}: SlideOverPaydayPlanDrawerProps) {
  const { fmt, fmtDate } = useLocale();

  const displayLines = useMemo(() => {
    if (!plan?.lines) return [];
    return plan.lines.filter((line) => {
      const amt = parseFloat(line.confirmedAmount || line.proposedAmount || "0");
      return amt > 0.001;
    });
  }, [plan?.lines]);

  if (!isOpen || !plan) return null;

  return (
    <SlideOverDrawer
      title={t("paydayDrawer.incomeSplitDetails")}
      onClose={onClose}
      widthClass="max-w-lg"
    >
      <div className="flex flex-col">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-800">
          <div className="p-3.5 bg-slate-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {t("paydayDrawer.incomeSource")}
              </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-100">{plan.incomeName || t("paydayDrawer.incomeDepositDefault")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {t("paydayDrawer.bankAccount")}
              </span>
              <span className="font-bold text-zinc-800 dark:text-zinc-100">{plan.receivingAccountName || t("paydayDrawer.mainAccountDefault")}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {t("paydayDrawer.incomeDate")}
              </span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{fmtDate(plan.expectedDate || plan.incomeDate || plan.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium text-zinc-500 dark:text-zinc-400">
                {t("paydayDrawer.incomeSplitDate")}
              </span>
              <span className="font-mono text-zinc-700 dark:text-zinc-300">{fmtDate(plan.createdAt)}</span>
            </div>
            {plan.note && (
              <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60 flex flex-col gap-0.5">
                <span className="font-medium text-zinc-500 dark:text-zinc-400">
                  {t("paydayDrawer.incomeNote")}
                </span>
                <span className="text-zinc-700 dark:text-zinc-300 italic">{plan.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Income Summary Banner */}
        <div className="p-6 bg-slate-50 dark:bg-zinc-800/40 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{t("payday.totalIncomeNet")}</span>
          <span className="text-lg font-black font-mono text-[#2563eb]">
            {fmt(plan.totalIncomeAmount)}
          </span>
        </div>

        {/* Waterfall Lines List */}
        <div className="p-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {t("paydayDrawer.splitBreakdown", { count: displayLines.length })}
          </h3>
          {displayLines.map((line, idx) => (
            <div
              key={line.planId + (line.poolId || line.categoryId || idx)}
              className="p-4 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60 rounded-xl space-y-1.5"
            >
              <div className="flex items-center justify-between">
                {line.poolId ? (
                  <Link
                    href={`/dashboard/envelopes?poolId=${line.poolId}`}
                    className="text-xs font-bold text-[#2563eb] hover:underline inline-flex items-center gap-0.5"
                  >
                    <span>{line.poolName || line.categoryName || t("paydayDrawer.envelopeAllocationDefault")}</span>
                    <span className="text-[10px] text-blue-400">↗</span>
                  </Link>
                ) : (
                  <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {line.poolName || line.categoryName || t("paydayDrawer.envelopeAllocationDefault")}
                  </h4>
                )}
                <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">
                  {fmt(parseFloat(line.confirmedAmount || line.proposedAmount || "0"))}
                </span>
              </div>
              {line.reasoning && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic leading-relaxed">
                  {line.reasoning}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Drawer Footer */}
        <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </div>
    </SlideOverDrawer>
  );
}
