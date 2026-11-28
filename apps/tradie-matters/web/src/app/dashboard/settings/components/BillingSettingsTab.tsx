"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@kaesava/ui/web";
import { BillingInvoicesTable, SubscriptionOverviewSection } from "@kaesava/capability-billing/web";
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

  return (
    <div className="space-y-6">
      <SubscriptionOverviewSection
        status={subStatus.data ? {
          ...subStatus.data,
          trialEndsAt: subStatus.data.trialEndsAt ? new Date(subStatus.data.trialEndsAt) : null,
          subscriptionEndsAt: subStatus.data.subscriptionEndsAt ? new Date(subStatus.data.subscriptionEndsAt) : null,
          nextBillingAt: subStatus.data.nextBillingAt ? new Date(subStatus.data.nextBillingAt) : null,
          gracePeriodEndsAt: subStatus.data.gracePeriodEndsAt ? new Date(subStatus.data.gracePeriodEndsAt) : null,
        } : null}
        isSyncing={syncSub.isPending}
        isOpeningPortal={createPortal.isPending}
        onSync={() => syncSub.mutate()}
        onUpgrade={() => router.push("/subscription/upgrade")}
        onManagePortal={handleOpenPortal}
      />
      <BillingInvoicesTable
        invoices={(invoicesQuery.data ?? []).map((inv) => ({
          ...inv,
          date: inv.paidAt ?? inv.createdAt,
          amountFormatted: `${inv.amountPaid} ${inv.currency}`,
        }))}
        onOpenInvoice={(url) => window.open(url, "_blank", "noopener,noreferrer")}
      />
    </div>
  );
}
