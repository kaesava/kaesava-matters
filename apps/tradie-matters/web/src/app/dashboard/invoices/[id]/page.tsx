"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Lock } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, Spinner, useCurrencyLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { IssueCreditNoteModal } from "./components/IssueCreditNoteModal";
import { RecordPaymentModal } from "./components/RecordPaymentModal";
import { RefundPaymentModal } from "./components/RefundPaymentModal";

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();
  const { currency, locale } = useCurrencyLocale();
  const utils = trpc.useUtils();
  const detailQuery = trpc.invoices.getById.useQuery({ id }, { enabled: Boolean(id) });

  const [payOpen, setPayOpen] = useState(false);
  const [creditOpen, setCreditOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);

  const sendMut = trpc.invoices.send.useMutation({
    onSuccess: async () => {
      await utils.invoices.getById.invalidate({ id });
      success(t("tradieWeb.invoiceSentSuccess"));
    },
  });

  if (detailQuery.isLoading) return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  const data = detailQuery.data;
  if (!data) return <div className="ui-card text-center py-10 text-sm text-slate-500">{t("tradieWeb.noInvoicesEmpty")}</div>;

  const { invoice, lines, payments, creditNotes } = data;
  const handleDownloadPdf = async () => {
    if (!invoice.pdfFileNoteId) return;
    const { downloadUrl } = await utils.fileNotes.getDownloadUrl.fetch({ id: invoice.pdfFileNoteId });
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/invoices" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
        <ArrowLeft className="w-4 h-4" /><span>{t("tradieWeb.backToInvoices")}</span>
      </Link>

      <div className="ui-card flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2563eb]">{invoice.invoiceNumber}</span>
            <Badge variant={invoice.status === "PAID" ? "success" : "primary"}>{invoice.status}</Badge>
            <Badge variant="warning">{invoice.documentTitle}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">{t("tradieWeb.dueDateLabel")}: {invoice.dueDate}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.pdfFileNoteId && (
            <Button type="button" variant="secondary" size="sm" onClick={() => void handleDownloadPdf()}>
              <Download className="w-3.5 h-3.5" /><span>{t("tradieWeb.downloadTaxInvoicePdf")}</span>
            </Button>
          )}
          <Button type="button" variant="secondary" size="sm" disabled={sendMut.isPending} onClick={() => sendMut.mutate({ id: invoice.id })}>{t("tradieInvoices.sendInvoice")}</Button>
          {Number(invoice.balanceDue) > 0 && <Button type="button" size="sm" onClick={() => setPayOpen(true)}>{t("tradieInvoices.recordPayment")}</Button>}
          <Button type="button" variant="secondary" size="sm" onClick={() => setCreditOpen(true)}>{t("tradieInvoices.issueCreditNote")}</Button>
          {payments.length > 0 && <Button type="button" variant="secondary" size="sm" onClick={() => setRefundOpen(true)}>{t("tradieInvoices.refundPayment")}</Button>}
        </div>
      </div>

      {invoice.lockedAt && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs font-semibold text-amber-800">
          <Lock className="w-4 h-4 shrink-0" /><span>{t("tradieInvoices.lockedImmutable")}</span>
        </div>
      )}

      <div className="ui-card space-y-2">
        {lines.map((l) => (
          <div key={l.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
            <span>{l.description} × {l.quantity}</span>
            <span className="font-mono font-semibold">{formatCurrency(Number(l.lineTotalIncTax), currency, locale)}</span>
          </div>
        ))}
        <div className="pt-2 text-right space-y-1 text-sm">
          <p>{t("tradieWeb.totalIncGstLabel")}: <span className="font-mono font-bold">{formatCurrency(Number(invoice.totalIncTax), currency, locale)}</span></p>
          <p className="text-emerald-700">{t("tradieInvoices.amountPaid")}: <span className="font-mono font-bold">{formatCurrency(Number(invoice.amountPaid), currency, locale)}</span></p>
          <p className="text-base font-extrabold text-[#1B2B4B]">{t("tradieInvoices.balanceDue")}: <span className="font-mono">{formatCurrency(Number(invoice.balanceDue), currency, locale)}</span></p>
        </div>
      </div>

      {creditNotes.length > 0 && (
        <div className="ui-card space-y-2">
          <h2 className="text-sm font-bold text-[#1B2B4B]">{t("tradieWeb.creditNotesTitle")}</h2>
          {creditNotes.map((cn) => (
            <div key={cn.id} className="flex justify-between text-xs text-slate-600">
              <span>{cn.creditNoteNumber} — {cn.reason}</span>
              <span className="font-mono font-semibold">{formatCurrency(Number(cn.totalIncTax), currency, locale)}</span>
            </div>
          ))}
        </div>
      )}

      <RecordPaymentModal invoiceId={invoice.id} defaultAmount={invoice.balanceDue} isOpen={payOpen} onClose={() => setPayOpen(false)} />
      <IssueCreditNoteModal invoiceId={invoice.id} gstRegistered={invoice.gstRegisteredSnapshot} isOpen={creditOpen} onClose={() => setCreditOpen(false)} />
      <RefundPaymentModal invoiceId={invoice.id} payments={payments} isOpen={refundOpen} onClose={() => setRefundOpen(false)} />
    </div>
  );
}
