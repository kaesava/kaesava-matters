"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowDownCircle } from "lucide-react";
import { t } from "@money-matters/i18n";
import { trpc } from "../../../../lib/trpc";
import { Tabs, SlideOverDrawer, formatRecurrenceLabel } from "@money-matters/ui/web";
import { useLocale } from "../../../../providers/LocaleProvider";
import { useAppFeatures } from "../../../../hooks/useAppFeatures";
import { FileNotesPanel } from "@money-matters/capability-file-notes/web";
import { CategorySummaryItem } from "../../envelopes/types";
import { DrawerUpcomingExpensesTable } from "./drawer/DrawerUpcomingExpensesTable";
import { DrawerActivityHistoryTable } from "./drawer/DrawerActivityHistoryTable";

export interface CategoryScheduledEvent {
  id: string;
  name: string;
  amount: string;
  dueDate: string;
  isPaid?: boolean;
}

export interface EnvelopeDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  categoryName: string;
  categoryId?: string;
  events?: CategoryScheduledEvent[];
  onMarkPaid?: (eventId: string, amount: string, date: string) => void;
  onEditPool?: (pool: CategorySummaryItem) => void;
  onDrawDown?: (pool: { id: string; name?: string }) => void;
}

export type SlideOverCategoryDrawerProps = EnvelopeDetailDrawerProps;

export function EnvelopeDetailDrawer({
  isOpen,
  onClose,
  categoryName,
  categoryId,
  events,
  onMarkPaid,
  onEditPool,
  onDrawDown,
}: EnvelopeDetailDrawerProps) {
  const { fmt, fmtDate, fmtTx } = useLocale();
  const { hasFileNotes } = useAppFeatures();
  const [activeTab, setActiveTab] = useState<"expenses" | "activity" | "notes">("expenses");

  // Fetch pool, categories, transactions, and fallback upcoming events
  const poolsQuery = trpc.listEnvelopes.useQuery(undefined, { enabled: isOpen });
  const transactionsQuery = trpc.listTransactions.useQuery({ limit: 200, offset: 0 }, { enabled: isOpen });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: isOpen && !events });

  // Find target pool by ID or Name
  const targetPool = useMemo(() => {
    if (!poolsQuery.data) return null;
    return poolsQuery.data.find(
      (p) => (categoryId && p.id === categoryId) || p.name.toLowerCase() === categoryName.toLowerCase()
    );
  }, [poolsQuery.data, categoryId, categoryName]);

  // Calculate effective monthly target amount for envelope
  const targetAmt = useMemo(() => {
    if (!targetPool) return null;
    return targetPool.monthlyAmount
      ? parseFloat(String(targetPool.monthlyAmount))
      : targetPool.targetAmount
      ? parseFloat(String(targetPool.targetAmount))
      : null;
  }, [targetPool]);

  // Related transactions
  const relatedTransactions = useMemo(() => {
    if (!transactionsQuery.data || !targetPool) return [];
    return transactionsQuery.data.filter(
      (tx) => tx.envelopeId === targetPool.id || (tx as unknown as { poolId?: string }).poolId === targetPool.id
    );
  }, [transactionsQuery.data, targetPool]);

  const effectiveEvents = useMemo(() => {
    if (events) return events;
    if (!expenseEventsQuery.data || !targetPool) return [];
    return expenseEventsQuery.data
      .filter((e) => e.status !== "CONFIRMED" && e.envelopeId === targetPool.id)
      .map((e) => ({
        id: e.id,
        name: e.name || "Expense",
        amount: e.expectedAmount,
        dueDate: e.expectedDate,
        isPaid: e.status === "CONFIRMED",
      }));
  }, [events, expenseEventsQuery.data, targetPool]);

  // Upcoming Expenses ordered by soonest Due Date (overdue pending first), limited to 5
  const upcomingExpensesList = useMemo(() => {
    return [...effectiveEvents]
      .sort((a, b) => new Date(a.dueDate + "T00:00:00").getTime() - new Date(b.dueDate + "T00:00:00").getTime())
      .slice(0, 5);
  }, [effectiveEvents]);

  // History Transactions limited to 5 latest
  const historyTransactionsList = useMemo(() => {
    return [...relatedTransactions]
      .sort((a, b) => new Date(b.recordedAt || 0).getTime() - new Date(a.recordedAt || 0).getTime())
      .slice(0, 5);
  }, [relatedTransactions]);

  if (!isOpen) return null;

  const currentBal = targetPool ? parseFloat(String(targetPool.currentBalance || "0")) : 0;

  const resolvedTabs = [
    { id: "expenses" as const, label: `${t("categoryDrawer.tabs.upcomingExpenses")} (${effectiveEvents.length})` },
    { id: "activity" as const, label: `${t("categoryDrawer.tabs.history")} (${relatedTransactions.length})` },
    ...(hasFileNotes ? [{ id: "notes" as const, label: t("fileNotes.title") }] : []),
  ];

  return (
    <SlideOverDrawer
      title={
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xl font-black text-[#1B2B4B] dark:text-white">
            {categoryName}
          </span>
          {targetPool && (
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {targetPool.envelopeType === "BILL"
                ? (targetPool.fundingMode === "RECURRING"
                    ? t("categories.recurringBadge")
                    : t("common.target"))
                : targetPool.envelopeType === "GOAL"
                ? (targetPool.fundingMode === "RECURRING"
                    ? t("categories.recurringBadge")
                    : t("common.target"))
                : t("categories.everydayBadge")}
            </span>
          )}
          {Boolean(targetPool?.isPriority) && targetPool?.envelopeType !== "EVERYDAY" && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              {t("categories.priorityBadge")}
            </span>
          )}
          {onEditPool && targetPool && (
            <button
              type="button"
              onClick={() => {
                onEditPool({
                  id: targetPool.id,
                  name: targetPool.name,
                  envelopeType: targetPool.envelopeType,
                  fundingMode: targetPool.fundingMode,
                  isPriority: targetPool.isPriority,
                  currentBalance: String(targetPool.currentBalance ?? "0.00"),
                  bankAccountId: targetPool.bankAccountId,
                  bankAccountName: targetPool.bankAccountName,
                  isPrivate: targetPool.isPrivate,
                  targetAmount: targetPool.targetAmount ? String(targetPool.targetAmount) : null,
                  enteredAmount: targetPool.enteredAmount ? String(targetPool.enteredAmount) : null,
                  monthlyAmount: targetPool.monthlyAmount ? String(targetPool.monthlyAmount) : null,
                  budgetFrequency: targetPool.budgetFrequency,
                  startDate: targetPool.startDate,
                  endDate: targetPool.endDate,
                  rrule: targetPool.rrule,
                  isSurplusTarget: targetPool.isSurplusTarget,
                  safetyBufferFloor: targetPool.safetyBufferFloor ? String(targetPool.safetyBufferFloor) : null,
                  generateEvents: targetPool.generateEvents,
                });
              }}
              className="px-2 py-0.5 text-xs font-bold text-[#2563eb] hover:text-blue-700 bg-blue-50 dark:bg-blue-950/60 rounded-md border border-blue-200 dark:border-blue-800 transition-colors cursor-pointer"
            >
              {t("common.edit")}
            </button>
          )}
        </div>
      }
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 space-y-4">
        {/* High-Level Read-Only Pool Details Cards — 2 Rows Grid */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700/60">
          {/* Row 1, Col 1: Current Balance + Subtle Draw Down */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {t("categoryDrawer.currentBalance")}
            </span>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span className="text-xl font-black font-mono text-[#1B2B4B] dark:text-white">
                {fmt(currentBal)}
              </span>
              {onDrawDown && targetPool && targetPool.envelopeType !== "EVERYDAY" && (
                <button
                  type="button"
                  disabled={currentBal <= 0}
                  onClick={() => {
                    if (currentBal <= 0) return;
                    onClose();
                    onDrawDown(targetPool);
                  }}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-emerald-50 border border-emerald-200 dark:border-emerald-800 rounded-lg transition-colors cursor-pointer"
                >
                  <ArrowDownCircle className="w-3 h-3 text-emerald-600" />
                  <span>{t("categories.actions.drawDown")}</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 1, Col 2: Linked Bank Account */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {t("categoryDrawer.linkedBankAccount")}
            </span>
            <div className="mt-1">
              {targetPool?.bankAccountName ? (
                <Link
                  href={targetPool.bankAccountId ? `/dashboard/bank-accounts?id=${targetPool.bankAccountId}` : `/dashboard/bank-accounts`}
                  onClick={onClose}
                  className="text-sm font-bold text-[#2563eb] hover:underline inline-flex items-center gap-1 truncate max-w-full"
                >
                  <span className="truncate">{targetPool.bankAccountName}</span>
                  <span className="text-xs">↗</span>
                </Link>
              ) : (
                <span className="text-sm font-medium text-zinc-400">—</span>
              )}
            </div>
          </div>

          {/* Row 2, Col 1: Target / Contribution Amount (Clean Numeric Amount) */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {t("categoryDrawer.targetAmount")}
            </span>
            <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
              {(() => {
                const isRecurring = targetPool?.fundingMode === "RECURRING";
                if (isRecurring) {
                  const entered = targetPool?.enteredAmount ? parseFloat(String(targetPool.enteredAmount)) : null;
                  const monthlyEquivalent = targetPool?.monthlyAmount ? parseFloat(String(targetPool.monthlyAmount)) : null;
                  const amt = entered ?? monthlyEquivalent ?? targetAmt;
                  return amt ? fmt(amt) : "—";
                }
                return targetAmt ? fmt(targetAmt) : "—";
              })()}
            </span>
          </div>

          {/* Row 2, Col 2: Recurrence / Target Date */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              {targetPool?.envelopeType === "GOAL" && targetPool?.fundingMode !== "RECURRING"
                ? t("categoryDrawer.targetDate")
                : t("categoryDrawer.recurrence")}
            </span>
            <span className="text-sm font-black font-mono text-zinc-700 dark:text-zinc-300">
              {targetPool?.envelopeType === "GOAL" && targetPool?.fundingMode !== "RECURRING"
                ? targetPool?.endDate
                  ? fmtDate(targetPool.endDate)
                  : "—"
                : targetPool?.fundingMode === "TARGET_BALANCE"
                ? t("forms.monthly")
                : targetPool?.fundingMode === "RECURRING"
                ? formatRecurrenceLabel(targetPool.rrule, targetPool.budgetFrequency)
                : "—"}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs
          tabs={resolvedTabs}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as "expenses" | "activity" | "notes")}
        />
      </div>

      {/* Drawer Body — Tab Content */}
      <div className="p-6">
        {activeTab === "expenses" && (
          <DrawerUpcomingExpensesTable
            poolId={targetPool?.id}
            upcomingExpensesList={upcomingExpensesList}
            onClose={onClose}
            onMarkPaid={onMarkPaid}
            fmt={fmt}
          />
        )}

        {activeTab === "activity" && (
          <DrawerActivityHistoryTable
            poolId={targetPool?.id}
            historyTransactionsList={historyTransactionsList}
            onClose={onClose}
            fmtDate={fmtDate}
            fmtTx={fmtTx}
          />
        )}

        {activeTab === "notes" && hasFileNotes && targetPool && (
          <FileNotesPanel
            entityType="ENVELOPE"
            entityId={targetPool.id}
          />
        )}
      </div>
    </SlideOverDrawer>
  );
}

export const SlideOverCategoryDrawer = EnvelopeDetailDrawer;
