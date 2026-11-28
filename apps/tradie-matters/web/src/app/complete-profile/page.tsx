"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Spinner } from "@kaesava/ui/web";
import { WebCompleteProfileCard } from "@kaesava/capability-auth/web";
import { DEFAULT_TIMEZONE, detectBestGuessCountry, getCountryDefaults } from "@kaesava/types";
import { authClient } from "../../lib/auth";
import { TRADIE_ACTIVE_TENANT_KEY, trpc } from "../../lib/trpc";
import { TradiePublicHeader } from "../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../components/TradiePublicFooter";
import "../../i18n";

function CompleteProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get("redirect") || "/setup";
  const redirectUrl = rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") && rawRedirect !== "/dashboard" ? rawRedirect : "/setup";

  const { data: session, isPending } = authClient.useSession();
  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, { enabled: !!session?.user, retry: false });
  const createTenant = trpc.createTenant.useMutation();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.replace("/sign-in");
      return;
    }
    if (tenantStatusQuery.data?.hasTenant) {
      window.location.href = tenantStatusQuery.data.setupCompleted ? "/dashboard" : "/setup";
    }
  }, [isPending, session?.user, tenantStatusQuery.data, router]);

  if (isPending || (session?.user && tenantStatusQuery.isLoading)) {
    return (
      <div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleSubmit = async (data: { name: string; householdName: string }) => {
    setError(null);
    setSubmitting(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
      const locale = typeof navigator !== "undefined" ? navigator.languages?.[0] || navigator.language || "" : "";
      const country = detectBestGuessCountry(locale, tz);
      const defaults = getCountryDefaults(country);
      const res = await createTenant.mutateAsync({
        name: data.householdName,
        displayName: data.name,
        country,
        currency: defaults.currency,
        timezone: tz || defaults.timezone,
      });
      if (res?.tenantId && typeof window !== "undefined") {
        localStorage.setItem(TRADIE_ACTIVE_TENANT_KEY, res.tenantId);
      }
      await authClient.updateUser({ name: data.name }).catch(() => {});
      window.location.href = redirectUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.unexpectedError"));
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between">
      <TradiePublicHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <WebCompleteProfileCard
          defaultName={session?.user?.name ?? ""}
          householdLabel={t("tradieWeb.businessLabel")}
          householdPlaceholder={t("tradieWeb.businessPlaceholder")}
          isSubmitting={submitting}
          error={error}
          onSubmit={handleSubmit}
        />
      </main>
      <TradiePublicFooter />
    </div>
  );
}

export default function CompleteProfilePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <CompleteProfileContent />
    </Suspense>
  );
}
