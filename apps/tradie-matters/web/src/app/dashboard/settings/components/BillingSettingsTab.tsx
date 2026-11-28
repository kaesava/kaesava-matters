"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Badge, Button, Spinner, fmtDateMedium } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export function BillingSettingsTab() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const subStatus = trpc.getSubscriptionStatus.useQuery();
  const invoicesQuery = trpc.listInvoices.useQuery();
  const createPortal = trpc.createCustomerPortalSession.useMutation();
  const syncSub = trpc.syncSubscription.useMutation({
    onSuccess: () => void utils.getSubscriptionStatus.invalidate(),
  });

  const handleOpenPortal = async () => {
    const res = await createPortal.mutateAsync({ returnUrl: `${window.location.origin}/dashboard/settings` });
    if (res.url) window.location.href = res.url;
  };

  if (subStatus.isLoading) {
    return <div className="flex justify-center py-8"><Spinner size="md" /></div>;
  }

  const s = subStatus.data;
  const badgeVariant = s?.isSubscribed ? "success" : s?.isPastDue ? "warning" : "primary";
  const invoices = invoicesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[#1B2B4B]">{t("tradieWeb.settingsBillingTab")}</h2>
          <Badge variant={badgeVariant}>
            {s?.isSubscribed ? t("subscription.activeBadge") : s?.isTrialActive ? t("subscription.trialBadge") : t("subscription.upgradeBadge")}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          {s?.isSubscribed ? (
            <Button type="button" loading={createPortal.isPending} onClick={handleOpenPortal}>
              {t("subscription.manageSubscription")}
            </Button>
          ) : (
            <Button type="button" onClick={() => router.push("/subscription/upgrade")}>
              {t("subscription.upgradeCta")}
            </Button>
          )}
          <Button type="button" variant="secondary" loading={syncSub.isPending} onClick={() => syncSub.mutate()}>
            {t("subscription.refreshTooltip")}
          </Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
        <h3 className="text-base font-semibold text-[#1B2B4B]">{t("subscription.invoiceHistoryTitle")}</h3>
        {invoices.length === 0 ? (
          <p className="text-sm text-slate-500">{t("subscription.noInvoices")}</p>
        ) : (
          <ul className="divide-y divide-slate-200 text-sm">
            {invoices.map((inv) => (
              <li key={inv.id} className="py-3 flex items-center justify-between">
                <span>{fmtDateMedium(inv.createdAt)}</span>
                <span className="font-mono font-semibold">{inv.amountPaid} {inv.currency}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
