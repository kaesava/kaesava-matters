"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, SetupDiscardConfirm, Spinner, useToast } from "@kaesava/ui/web";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { TradiePublicHeader } from "../../components/TradiePublicHeader";
import { SetupStep1Business, type SetupStep1Data } from "./components/SetupStep1Business";
import { SetupStep2Terms, type SetupStep2Data } from "./components/SetupStep2Terms";
import { SetupStep3Crew, type SetupStep3Data } from "./components/SetupStep3Crew";
import "../../i18n";

export default function SetupPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { data: session, isPending } = authClient.useSession();
  const tenantStatus = trpc.getTenantStatus.useQuery(undefined, { enabled: !!session?.user, retry: false });
  const profileQuery = trpc.getBusinessProfile.useQuery(undefined, { enabled: !!session?.user && !!tenantStatus.data?.hasTenant });
  const completeSetup = trpc.completeBusinessSetup.useMutation();
  const upsertMember = trpc.upsertTeamMemberProfile.useMutation();

  const [step, setStep] = useState(1);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [s1Draft, setS1] = useState<SetupStep1Data | null>(null);
  const p = profileQuery.data;
  const s1: SetupStep1Data = s1Draft ?? {
    businessName: p?.businessName || "",
    tradeType: p?.tradeType || "GENERAL",
    abn: p?.abn || "",
    gstRegistered: p?.gstRegistered ?? true,
    defaultTaxRatePercent: p?.defaultTaxRatePercent || "10",
  };
  const [s2, setS2] = useState<SetupStep2Data>({ quotePrefix: "Q-", nextQuoteNumber: 1001, invoicePrefix: "INV-", nextInvoiceNumber: 1001, defaultPaymentTermsDays: 14, defaultHourlyChargeRate: "120.00", bankAccountName: "", bankBsb: "", bankAccountNumber: "" });
  const [s3, setS3] = useState<SetupStep3Data>({ tradeLicenseNumber: "", licenseExpiryDate: "", internalHourlyCostRate: "", defaultChargeOutRate: "120.00", isFieldActive: true });

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in");
    if (tenantStatus.data && !tenantStatus.data.hasTenant) router.replace("/complete-profile");
  }, [isPending, session?.user, tenantStatus.data, router]);

  const handleFinish = async () => {
    setError(null);
    try {
      await completeSetup.mutateAsync({
        businessName: s1.businessName.trim() || undefined,
        tradeType: s1.tradeType.trim() || "GENERAL",
        abn: s1.abn.trim() || null,
        gstRegistered: s1.gstRegistered,
        defaultTaxRatePercent: s1.defaultTaxRatePercent.trim() || "10",
        quotePrefix: s2.quotePrefix.trim() || "Q-",
        nextQuoteNumber: s2.nextQuoteNumber,
        invoicePrefix: s2.invoicePrefix.trim() || "INV-",
        nextInvoiceNumber: s2.nextInvoiceNumber,
        defaultPaymentTermsDays: s2.defaultPaymentTermsDays,
        defaultHourlyChargeRate: s2.defaultHourlyChargeRate.trim() || null,
        bankAccountName: s2.bankAccountName.trim() || null,
        bankBsb: s2.bankBsb.trim() || null,
        bankAccountNumber: s2.bankAccountNumber.trim() || null,
      });
      if (session?.user?.id) {
        await upsertMember.mutateAsync({
          userId: session.user.id,
          tradeLicenseNumber: s3.tradeLicenseNumber.trim() || null,
          licenseExpiryDate: s3.licenseExpiryDate || null,
          internalHourlyCostRate: s3.internalHourlyCostRate.trim() || null,
          defaultChargeOutRate: s3.defaultChargeOutRate.trim() || null,
          isFieldActive: s3.isFieldActive,
        });
      }
      showToast({ type: "success", message: t("tradieWeb.setupSavedSuccess") });
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.unexpectedError"));
    }
  };

  if (isPending || tenantStatus.isLoading) {
    return <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col">
      <TradiePublicHeader />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-10">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-lg p-8 space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563eb]">{t("tradieWeb.setupStepIndicator", { step: String(step), total: "3" })}</span>
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] mt-1">{t("tradieSetup.title")}</h1>
            <p className="text-sm text-slate-500">{t("tradieSetup.subtitle")}</p>
          </div>
          {error && <FormErrorBanner message={error} />}
          {step === 1 && <SetupStep1Business data={s1} onChange={setS1} />}
          {step === 2 && <SetupStep2Terms data={s2} onChange={setS2} />}
          {step === 3 && <SetupStep3Crew data={s3} onChange={setS3} />}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            {step > 1 ? <Button type="button" variant="secondary" onClick={() => setStep(step - 1)}>{t("tradieWeb.setupPrevStep")}</Button> : <span />}
            {step < 3 ? (
              <Button type="button" onClick={() => setStep(step + 1)}>{t("tradieWeb.setupNextStep")}</Button>
            ) : (
              <Button type="button" loading={completeSetup.isPending || upsertMember.isPending} onClick={handleFinish}>
                {t("tradieSetup.completeSetupAction")}
              </Button>
            )}
          </div>
        </div>
      </main>
      <SetupDiscardConfirm
        isOpen={discardOpen}
        title={t("common.discardChangesTitle")}
        message={t("common.discardChangesMessage")}
        confirmLabel={t("common.discard")}
        cancelLabel={t("common.keepEditing")}
        onConfirm={() => { setDiscardOpen(false); router.push("/dashboard"); }}
        onCancel={() => setDiscardOpen(false)}
      />
    </div>
  );
}
