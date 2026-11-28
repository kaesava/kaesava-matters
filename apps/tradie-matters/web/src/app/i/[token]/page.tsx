"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Copy, CreditCard, Landmark } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, Spinner, useToast } from "@kaesava/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { trpc } from "../../../lib/trpc";
import "../../../i18n";

export default function InvoicePortalPage() {
  const { token } = useParams<{ token: string }>();
  const { success } = useToast();
  const { fmt, fmtDateMedium } = useLocale();
  const viewQuery = trpc.portalInvoice.view.useQuery({ rawToken: token }, { enabled: Boolean(token), retry: false });

  const checkoutMut = trpc.portalInvoice.createCheckout.useMutation({
    onSuccess: (res) => {
      const targetUrl = (res as { checkoutUrl?: string; url?: string }).checkoutUrl ?? res.url;
      if (targetUrl) window.location.href = targetUrl;
    },
  });

  if (viewQuery.isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  const data = viewQuery.data;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">{t("tradieWeb.portalLinkInvalid")}</div>;

  const { invoice, lines, paymentMethods, stripeChargesEnabled } = data;
  const allowCard = paymentMethods.includes("card");
  const copyRef = async (val: string) => {
    await navigator.clipboard.writeText(val);
    success(t("tradieWeb.copiedToClipboard"));
  };

  return (
    <main className="min-h-screen bg-[#F7F8FA] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#2563eb]">{invoice.documentTitle} • {invoice.invoiceNumber}</span>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 mt-1 font-mono tabular-nums">{fmt(Number(invoice.balanceDue))}</p>
            <p className="text-xs text-slate-500">{t("tradieInvoices.balanceDue")} • {t("tradieWeb.dueDateLabel")}: {fmtDateMedium(invoice.dueDate)}</p>
          </div>
          <Badge variant={invoice.status === "PAID" ? "success" : "primary"}>{invoice.status}</Badge>
        </div>

        {Number(invoice.balanceDue) > 0 && (
          <section className="bg-blue-50/70 rounded-2xl border border-blue-200 p-6 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Landmark className="w-5 h-5 text-[#2563eb]" />
                <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradieWeb.payIdBsbTitle")}</h2>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={() => void copyRef(invoice.invoiceNumber)}>
                <Copy className="w-3.5 h-3.5" /><span>{t("tradieWeb.copyReferenceAction")}</span>
              </Button>
            </div>
            <p className="text-xs text-slate-600">{t("tradieWeb.payIdBsbZeroFeeNote", { ref: invoice.invoiceNumber })}</p>
            {stripeChargesEnabled && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="button" disabled={checkoutMut.isPending} onClick={() => checkoutMut.mutate({ rawToken: token, successUrl: window.location.href, cancelUrl: window.location.href })}>
                  <CreditCard className="w-4 h-4" />
                  <span>{allowCard ? t("tradieInvoices.payOnline") : t("tradieInvoices.payByBankDirectDebit")}</span>
                </Button>
                <span className="text-xs font-semibold text-emerald-700">{t("tradieWeb.zeroSurchargeLabel")}</span>
              </div>
            )}
          </section>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
          {lines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
              <span>{l.description} × {l.quantity}</span>
              <span className="font-mono font-semibold tabular-nums">{fmt(Number(l.lineTotalIncTax))}</span>
            </div>
          ))}
          {!invoice.gstRegisteredSnapshot && (
            <p className="text-xs text-slate-500 pt-2">{t("tradieInvoices.noGstCharged")}</p>
          )}
        </div>
      </div>
    </main>
  );
}
