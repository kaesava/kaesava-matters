'use client';

import React from 'react';
import { t } from '@money-matters/i18n';
import { InfoTooltip } from '@money-matters/ui/web';
import { BillCoverageBadge } from './BillCoverageBadge';
import { useLocale } from '../../../providers/LocaleProvider';

export interface BentoEnvelopesSectionProps {
  readonly everydayBalance: number;
  readonly everydayMonthlyBudget?: number;
  readonly safetyBufferFloor?: number;
  readonly billsBalance: number;
  readonly billsMonthlyBudget?: number;
  readonly daysUntilPayday?: number;
  readonly hasNextPayday?: boolean;
  readonly safeToSpend?: number;
  readonly dailyPace?: number;
  readonly paceStatus?: "AHEAD" | "ON_TRACK" | "BEHIND" | "CRITICAL" | "AWAITING_FIRST_PAYDAY";
  readonly isAwaitingFirstPayday?: boolean;
  
  // Integrated Shortfall Alert Props
  readonly billsShortfall: number;
  readonly billsDue14DaysCount: number;
  readonly totalBillsDue14Days: number;

  readonly onMoveMoney: () => void;
  readonly onAlignEverydayBalance?: () => void;
  readonly formatCurrency?: (val: number | string) => string;
}

export const BentoEnvelopesSection: React.FC<BentoEnvelopesSectionProps> = ({
  everydayBalance,
  everydayMonthlyBudget = 0,
  safetyBufferFloor = 0,
  billsBalance,
  billsMonthlyBudget = 0,
  daysUntilPayday,
  hasNextPayday = true,
  safeToSpend,
  dailyPace = 0,
  paceStatus: _paceStatus,
  isAwaitingFirstPayday = false,
  billsShortfall,
  billsDue14DaysCount,
  totalBillsDue14Days,
  onMoveMoney,
  onAlignEverydayBalance,
  formatCurrency,
}) => {
  const { fmt } = useLocale();
  const format = formatCurrency ?? fmt;
  const effectiveDays = daysUntilPayday !== undefined ? daysUntilPayday : 14;
  const effectiveSafeToSpend = safeToSpend !== undefined ? safeToSpend : everydayBalance;
  const isBufferDipped = safetyBufferFloor > 0 && everydayBalance < safetyBufferFloor;
  const isBillsRisk = !isAwaitingFirstPayday && billsShortfall >= 0.01;
  const showEverydayWarning = !isAwaitingFirstPayday && isBufferDipped;
  const bufferDippedTooltip = t('dashboard.hero.headsUpBufferTooltip', {
    balance: format(everydayBalance),
    buffer: format(safetyBufferFloor),
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Everyday Spending Pool Card */}
        <div
          className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all"
        >
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.everydayEnvelopeTitle')}
              </span>
              {isAwaitingFirstPayday ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                  {t('dashboard.hero.firstPaydayPendingBadge')}
                </span>
              ) : showEverydayWarning ? (
                <span className="inline-flex items-center gap-1">
                  <span
                    title={bufferDippedTooltip}
                    className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200"
                  >
                    {t('dashboard.hero.bufferDippedBadge')}
                  </span>
                  <InfoTooltip content={bufferDippedTooltip} align="right" />
                </span>
              ) : null}
            </div>

            <div>
              <div>
                <span className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B] dark:text-zinc-100">
                  {format(effectiveSafeToSpend)}
                </span>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mt-0.5">
                  {t('dashboard.hero.safeToSpendLabel')}
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 font-medium">
                {!hasNextPayday
                  ? t('dashboard.hero.estRemainingNoPayday', { pace: format(dailyPace) })
                  : effectiveDays <= 0
                  ? t('dashboard.hero.estRemainingToday')
                  : t('dashboard.hero.estRemaining', { pace: format(dailyPace), days: effectiveDays })
                }
              </p>
              <div className="flex items-center justify-between gap-2 mt-2.5 pt-2.5 border-t border-gray-100 dark:border-zinc-800/80">
                <span className="text-xs font-semibold text-slate-600 dark:text-zinc-300 font-mono tabular-nums">
                  {t('dashboard.hero.currentBalanceLabel', { amount: format(everydayBalance) })}
                </span>
                {onAlignEverydayBalance && (
                  <button
                    type="button"
                    onClick={onAlignEverydayBalance}
                    className="text-xs font-bold text-[#2563eb] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline px-2 py-0.5 rounded-lg hover:bg-blue-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    title={t('dashboard.hero.alignBalanceTooltip')}
                  >
                    {t('dashboard.hero.alignBalance')}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Target Allowance & Buffer Protection */}
          <div className="flex justify-between items-center pt-4 mt-auto border-t border-gray-100 dark:border-zinc-800 text-xs text-gray-500">
            <span>
              {everydayMonthlyBudget > 0
                ? t('dashboard.hero.everydayAllowanceCycle', { amount: format(everydayMonthlyBudget) })
                : null}
            </span>
            {safetyBufferFloor > 0 && (
              isBufferDipped ? (
                <span className={`font-extrabold normal-case ${everydayBalance <= 0 ? 'text-[#ba1a1a]' : 'text-amber-600 dark:text-amber-400'}`}>
                  ⚠️ {t('dashboard.hero.bufferDipped', { amount: format(safetyBufferFloor) })}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-extrabold normal-case">
                  🛡️ {t('dashboard.hero.bufferProtected', { amount: format(safetyBufferFloor) })}
                </span>
              )
            )}
          </div>
        </div>

        {/* Bills Pool Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl p-5 shadow-xs flex flex-col justify-between hover:border-zinc-300 dark:hover:border-zinc-700 transition-all">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-gray-500">
                {t('dashboard.hero.billsEnvelopeTitle')}
              </span>
              {!isAwaitingFirstPayday && (
                <BillCoverageBadge
                  status={isBillsRisk ? "SHORT_BY" : "COVERED"}
                  shortfallAmount={isBillsRisk ? billsShortfall : null}
                />
              )}
            </div>

            <div>
              <div className="text-3xl font-extrabold font-mono tabular-nums tracking-tight text-[#1B2B4B] dark:text-zinc-100">
                {format(billsBalance)}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {t('dashboard.hero.billsRingFencedSubtitle')}
              </p>
            </div>

            {/* Shortfall or Coverage Status Banner */}
            {isAwaitingFirstPayday ? (
              <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/50 rounded-xl flex items-center justify-between text-xs">
                <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                  {t('dashboard.hero.firstPaydayBillsNotice')}
                </span>
              </div>
            ) : isBillsRisk ? (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 rounded-xl flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-rose-800 dark:text-rose-300">
                  {t(hasNextPayday ? 'dashboard.hero.billsDuePaydaySummary' : 'dashboard.hero.billsDueSummary', { count: billsDue14DaysCount, amount: format(totalBillsDue14Days) })}
                </span>
                <button
                  type="button"
                  onClick={onMoveMoney}
                  className="px-2.5 py-1 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  {t('dashboard.hero.coverShortfall')}
                </button>
              </div>
            ) : (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-xl flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                <span>
                  {billsDue14DaysCount === 0
                    ? t(hasNextPayday ? 'dashboard.hero.noBillsDuePayday' : 'dashboard.hero.noBillsDue14Days')
                    : t(hasNextPayday ? 'dashboard.hero.billsPaydayCovered' : 'dashboard.hero.billsFullyCovered')}
                </span>
              </div>
            )}
          </div>

          {/* Monthly Cap Footnote */}
          <div className="pt-3 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center text-xs text-gray-500 mt-auto">
            <span>{t('dashboard.hero.targetMonthlyBills', { amount: format(billsMonthlyBudget) })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BentoEnvelopesSection;
