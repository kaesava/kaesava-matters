"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { t } from "@kaesava/i18n";
import { calculateQuoteTotals } from "@tradie-matters/capability-operations";
import { Badge, Button, formatCurrency, Spinner, useCurrencyLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { QuotePortalAcceptForm } from "./components/QuotePortalAcceptForm";
import "../../../i18n";

export default function QuotePortalPage() {
  const { token } = useParams<{ token: string }>();
  const { success } = useToast();
  const { currency, locale } = useCurrencyLocale();
  const viewQuery = trpc.portalQuote.view.useQuery({ rawToken: token }, { enabled: Boolean(token), retry: false });
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [depositToken, setDepositToken] = useState<string | null>(null);

  const acceptMut = trpc.portalQuote.accept.useMutation({
    onSuccess: (res) => {
      if (res.depositPortalToken) setDepositToken(res.depositPortalToken);
      success(t("tradieWeb.quoteAcceptedSuccess"));
      void viewQuery.refetch();
    },
  });
  const declineMut = trpc.portalQuote.decline.useMutation({
    onSuccess: () => {
      success(t("tradieWeb.quoteDeclinedSuccess"));
      void viewQuery.refetch();
    },
  });

  if (viewQuery.isLoading) return <div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>;
  const data = viewQuery.data;
  if (!data) return <div className="min-h-screen flex items-center justify-center text-sm text-slate-500">{t("tradieWeb.portalLinkInvalid")}</div>;

  const { quote, optionGroups, lines } = data;
  const defaultGroupId = (optionGroups.find((g) => g.isSelected) ?? optionGroups.find((g) => g.isRecommended) ?? optionGroups[0])?.id ?? null;
  const activeGroupId = selectedGroupId ?? defaultGroupId;
  const activeLines = optionGroups.length > 0 ? lines.filter((l) => !l.optionGroupId || l.optionGroupId === activeGroupId) : lines;
  const totals = calculateQuoteTotals({
    gstMode: quote.gstMode as "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE",
    depositType: quote.depositType as "NONE" | "PERCENT" | "FIXED",
    depositValue: Number(quote.depositValue) || 0,
    lines: activeLines.map((l) => ({ quantity: Number(l.quantity), unitSellPrice: Number(l.unitSellPrice), taxCode: l.taxCode === "GST_FREE" ? "GST_FREE" : "GST" })),
  });

  return (
    <main className="min-h-screen bg-[#F7F8FA] py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap justify-between gap-4">
          <div>
            <span className="font-mono text-xs font-bold text-[#2563eb]">{quote.quoteNumber}</span>
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] mt-1">{quote.title}</h1>
          </div>
          <Badge variant={quote.status === "ACCEPTED" ? "success" : "primary"}>{quote.status}</Badge>
        </div>

        {optionGroups.length > 0 && quote.status !== "ACCEPTED" && (
          <div className="grid sm:grid-cols-3 gap-3">
            {optionGroups.map((g) => (
              <button key={g.id} type="button" onClick={() => setSelectedGroupId(g.id)} className={`p-4 rounded-xl border text-left cursor-pointer ${activeGroupId === g.id ? "border-[#2563eb] bg-blue-50/50" : "border-slate-200 bg-white"}`}>
                <p className="font-bold text-sm text-[#1B2B4B]">{g.name}</p>
                {g.isRecommended && <Badge variant="primary">{t("tradieQuotes.recommendedOption")}</Badge>}
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          {activeLines.map((l) => (
            <div key={l.id} className="flex justify-between text-sm border-b border-slate-100 pb-2">
              <span className="text-[#1B2B4B]">{l.description} × {l.quantity}</span>
              <span className="font-mono font-semibold">{formatCurrency(Number(l.lineTotalIncTax), currency, locale)}</span>
            </div>
          ))}
          <div className="pt-2 text-right space-y-1 text-sm">
            <p className="text-slate-500">{t("tradieWeb.subtotalExGst")}: <span className="font-mono">{formatCurrency(totals.subtotalExTax, currency, locale)}</span></p>
            <p className="text-slate-500">{t("tradieWeb.gstAmountLabel")}: <span className="font-mono">{formatCurrency(totals.totalTax, currency, locale)}</span></p>
            <p className="text-lg font-extrabold text-[#1B2B4B]">{t("tradieWeb.totalIncGstLabel")}: <span className="font-mono">{formatCurrency(totals.totalIncTax, currency, locale)}</span></p>
          </div>
        </div>

        {depositToken && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" /><span>{t("tradieWeb.depositReadyToPay")}</span>
            </div>
            <Link href={`/i/${depositToken}`}><Button type="button">{t("tradieWeb.payDepositNow")}</Button></Link>
          </div>
        )}

        {quote.status !== "ACCEPTED" && quote.status !== "DECLINED" && (
          <QuotePortalAcceptForm
            isPending={acceptMut.isPending || declineMut.isPending}
            onAccept={(signerName, signatureSvg) => acceptMut.mutate({ rawToken: token, signerName, signatureSvg, selectedOptionGroupId: activeGroupId })}
            onDecline={() => declineMut.mutate({ rawToken: token })}
          />
        )}
      </div>
    </main>
  );
}
