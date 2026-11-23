"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { ModalDialog, ConfirmDialog, Button, AmountField, DatePickerField, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { useLocale } from "../../../../providers/LocaleProvider";

export interface ScheduleBurstSource {
  id: string;
  name: string;
  amount: string | number;
  rrule?: string | null;
}

interface ScheduleBurstModalProps {
  isOpen: boolean;
  mode: "INCOME" | "EXPENSE";
  source: ScheduleBurstSource | null;
  onClose: () => void;
}

export function ScheduleBurstModal({ isOpen, mode, source, onClose }: ScheduleBurstModalProps) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { fmt, fmtDate } = useLocale();
  const isIncome = mode === "INCOME";

  const incomeEventsQuery = trpc.listIncomeEvents.useQuery(undefined, { enabled: isOpen && isIncome });
  const expenseEventsQuery = trpc.listExpenseEvents.useQuery(undefined, { enabled: isOpen && !isIncome });
  const overrideMut = trpc.overrideEvent.useMutation();
  const deleteIncomeMut = trpc.deleteIncomeEvent.useMutation();
  const deleteExpenseMut = trpc.deleteExpenseEvent.useMutation();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editDate, setEditDate] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  if (!isOpen || !source) return null;

  const events = isIncome
    ? (incomeEventsQuery.data ?? []).filter((e) => e.incomeSourceId === source.id)
    : (expenseEventsQuery.data ?? []).filter((e) => e.envelopeId === source.id);

  const invalidateAll = async () => {
    await Promise.all([
      utils.listIncomeEvents.invalidate(),
      utils.listExpenseEvents.invalidate(),
      utils.getHorizonProjectionData.invalidate(),
      utils.getHomeSummary.invalidate(),
    ]);
  };

  const handleSaveEdit = async (eventId: string) => {
    const num = parseFloat(editAmount);
    if (isNaN(num) || num <= 0) return;
    try {
      await overrideMut.mutateAsync({
        eventId,
        eventType: isIncome ? "INCOME" : "EXPENSE",
        expectedAmount: num.toFixed(2),
        expectedDate: editDate,
      });
      await invalidateAll();
      toast.success(t("toasts.saved"));
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      if (isIncome) await deleteIncomeMut.mutateAsync({ eventId: deleteTargetId });
      else await deleteExpenseMut.mutateAsync({ eventId: deleteTargetId });
      await invalidateAll();
      toast.success(t("toasts.deleted"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("common.errorTryAgain"));
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <>
      <ModalDialog
        isOpen={isOpen}
        onClose={onClose}
        title={source.name}
        subtitle={t("planTabs.upcomingTimeline")}
        maxWidth="max-w-xl"
      >
        <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {events.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">{t("planTabs.noUpcomingEventsFound")}</p>
          ) : (
            events.map((evt) => {
              const isEditing = editingId === evt.id;
              const isConfirmed = evt.status === "CONFIRMED";
              return (
                <div
                  key={evt.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 space-y-2"
                >
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <AmountField label={t("common.amount")} value={editAmount} onChange={setEditAmount} required />
                        <DatePickerField label={t("tables.date")} value={editDate} onChange={setEditDate} required />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                          {t("common.cancel")}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          loading={overrideMut.isPending}
                          onClick={() => handleSaveEdit(evt.id)}
                        >
                          {t("common.save")}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#1B2B4B] dark:text-white">{fmtDate(evt.expectedDate)}</p>
                        <p className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                          {fmt(parseFloat(evt.expectedAmount))}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {!isConfirmed && (
                          <>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                setEditingId(evt.id);
                                setEditAmount(parseFloat(evt.expectedAmount).toFixed(2));
                                setEditDate(evt.expectedDate.slice(0, 10));
                              }}
                            >
                              {t("common.edit")}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTargetId(evt.id)}
                            >
                              {t("common.delete")}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
        <div className="pt-4 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            {t("common.close")}
          </Button>
        </div>
      </ModalDialog>

      <ConfirmDialog
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={handleConfirmDelete}
        title={isIncome ? t("common.deleteIncomeTitle") : t("common.deleteExpenseTitle")}
        description={isIncome ? t("common.deleteIncomePrompt") : t("common.deleteExpensePrompt")}
        confirmLabel={t("common.delete")}
        variant="danger"
      />
    </>
  );
}
