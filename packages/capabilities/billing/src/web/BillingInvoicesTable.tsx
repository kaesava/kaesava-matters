"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge, fmtDate } from "@kaesava/ui/web";

export interface BillingInvoiceItem {
  id: string;
  date: string | Date;
  amountFormatted: string;
  status: string;
  invoiceUrl?: string | null;
  pdfUrl?: string | null;
}

export interface BillingInvoicesTableProps {
  invoices: BillingInvoiceItem[];
  isLoading?: boolean;
  onOpenInvoice: (url: string) => void;
}

export function BillingInvoicesTable({ invoices, isLoading, onOpenInvoice }: BillingInvoicesTableProps) {
  if (isLoading) return null;

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
        {t("subscription.invoiceHistoryTitle")}
      </h3>
      {invoices.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("subscription.noInvoices")}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500">
                <th className="py-2 text-left font-medium">{t("common.date")}</th>
                <th className="py-2 text-center font-medium">{t("common.status")}</th>
                <th className="py-2 text-right font-medium">{t("common.amount")}</th>
                <th className="py-2 text-center font-medium">{t("subscription.invoiceReceipt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {invoices.map((inv) => {
                const isPaid = inv.status.toLowerCase() === "paid";
                const link = inv.pdfUrl || inv.invoiceUrl;
                return (
                  <tr key={inv.id}>
                    <td className="py-2.5 text-left text-slate-700 dark:text-slate-300">{fmtDate(inv.date)}</td>
                    <td className="py-2.5 text-center">
                      <Badge variant={isPaid ? "success" : "warning"}>
                        {isPaid ? t("subscription.statusPaid") : t("subscription.statusOpen")}
                      </Badge>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {inv.amountFormatted}
                    </td>
                    <td className="py-2.5 text-center">
                      {link && (
                        <button
                          type="button"
                          onClick={() => onOpenInvoice(link)}
                          className="text-xs font-medium text-blue-600 hover:underline"
                        >
                          {isPaid ? t("subscription.downloadReceipt") : t("subscription.payInvoice")}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
