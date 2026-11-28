"use client";

import React, { useId } from "react";
import { t } from "@kaesava/i18n";
import { FormLabel } from "@kaesava/ui/web";

export interface SetupStep2Data {
  quotePrefix: string;
  nextQuoteNumber: number;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  defaultPaymentTermsDays: number;
  defaultHourlyChargeRate: string;
  bankAccountName: string;
  bankBsb: string;
  bankAccountNumber: string;
}

interface Props {
  data: SetupStep2Data;
  onChange: (next: SetupStep2Data) => void;
}

export function SetupStep2Terms({ data, onChange }: Props) {
  const qpId = useId();
  const qnId = useId();
  const ipId = useId();
  const inId = useId();
  const termsId = useId();
  const rateId = useId();
  const accNameId = useId();
  const bsbId = useId();
  const accNumId = useId();

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-[#1B2B4B]">{t("tradieWeb.setupStep2Title")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={qpId}>{t("tradieSetup.quotePrefixLabel")}</FormLabel>
          <input id={qpId} autoFocus value={data.quotePrefix} onChange={(e) => onChange({ ...data, quotePrefix: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={qnId}>{t("tradieSetup.nextQuoteNumberLabel")}</FormLabel>
          <input id={qnId} type="number" min={1} value={data.nextQuoteNumber} onChange={(e) => onChange({ ...data, nextQuoteNumber: Number(e.target.value) || 1 })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={ipId}>{t("tradieSetup.invoicePrefixLabel")}</FormLabel>
          <input id={ipId} value={data.invoicePrefix} onChange={(e) => onChange({ ...data, invoicePrefix: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={inId}>{t("tradieSetup.nextInvoiceNumberLabel")}</FormLabel>
          <input id={inId} type="number" min={1} value={data.nextInvoiceNumber} onChange={(e) => onChange({ ...data, nextInvoiceNumber: Number(e.target.value) || 1 })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={termsId}>{t("tradieSetup.paymentTermsLabel")}</FormLabel>
          <input id={termsId} type="number" min={0} max={365} value={data.defaultPaymentTermsDays} onChange={(e) => onChange({ ...data, defaultPaymentTermsDays: Number(e.target.value) || 0 })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={rateId}>{t("tradieSetup.hourlyChargeRateLabel")}</FormLabel>
          <input id={rateId} value={data.defaultHourlyChargeRate} onChange={(e) => onChange({ ...data, defaultHourlyChargeRate: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3 pt-2">
        <div>
          <FormLabel htmlFor={accNameId}>{t("tradieSetup.bankAccountNameLabel")}</FormLabel>
          <input id={accNameId} value={data.bankAccountName} onChange={(e) => onChange({ ...data, bankAccountName: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm" />
        </div>
        <div>
          <FormLabel htmlFor={bsbId}>{t("tradieSetup.bankBsbLabel")}</FormLabel>
          <input id={bsbId} value={data.bankBsb} onChange={(e) => onChange({ ...data, bankBsb: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
        <div>
          <FormLabel htmlFor={accNumId}>{t("tradieSetup.bankAccountNumberLabel")}</FormLabel>
          <input id={accNumId} value={data.bankAccountNumber} onChange={(e) => onChange({ ...data, bankAccountNumber: e.target.value })} className="h-10 w-full rounded-xl border border-slate-300 px-3 text-sm font-mono" />
        </div>
      </div>
    </div>
  );
}
