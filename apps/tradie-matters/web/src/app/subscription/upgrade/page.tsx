"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, Spinner } from "@kaesava/ui/web";
import type { PlanKey } from "@kaesava/types";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";
import { TradiePublicHeader } from "../../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../../components/TradiePublicFooter";
import { TradiePricingSection } from "../../../components/TradiePricingSection";
import "../../../i18n";

export default function UpgradePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) router.replace("/sign-in?redirect=/subscription/upgrade");
  }, [isPending, session, router]);

  const subStatusQuery = trpc.getSubscriptionStatus.useQuery(undefined, { enabled: !!session?.user });
  const createCheckout = trpc.createCheckoutSession.useMutation();
  const createPortal = trpc.createCustomerPortalSession.useMutation();

  const handleSelectPlan = async (planType: PlanKey) => {
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await createCheckout.mutateAsync({ planType, successUrl: `${origin}/subscription/success`, cancelUrl: `${origin}/subscription/upgrade` });
      if (res.url) window.location.assign(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subscription.portalError"));
    }
  };

  const handleManagePortal = async () => {
    setError(null);
    try {
      const origin = window.location.origin;
      const res = await createPortal.mutateAsync({ returnUrl: `${origin}/dashboard/settings` });
      if (res.url) window.location.assign(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("subscription.portalError"));
    }
  };

  if (isPending || subStatusQuery.isLoading) {
    return <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between">
      <TradiePublicHeader />
      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 space-y-8">
        {error && <FormErrorBanner message={error} />}
        {subStatusQuery.data?.isSubscribed ? (
          <div className="max-w-xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h1 className="text-xl font-bold text-[#1B2B4B]">{t("subscription.alreadySubscribedTitle")}</h1>
            <p className="text-sm text-slate-600">{t("subscription.alreadySubscribedSubtitle")}</p>
            <div className="flex gap-3">
              <Button type="button" onClick={handleManagePortal} loading={createPortal.isPending}>{t("subscription.manageSubscription")}</Button>
              <Button type="button" variant="secondary" onClick={() => router.push("/dashboard")}>{t("subscription.backToDashboard")}</Button>
            </div>
          </div>
        ) : (
          <TradiePricingSection mode="upgrade" onSelectPlan={handleSelectPlan} loading={createCheckout.isPending} />
        )}
      </main>
      <TradiePublicFooter />
    </div>
  );
}
