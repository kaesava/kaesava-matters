"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { t } from "@money-matters/i18n";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const verifier = searchParams.get("neon_auth_session_verifier");
  const oauthError = searchParams.get("error");
  const [exchanged, setExchanged] = useState(!verifier);

  useEffect(() => {
    if (!verifier) return;
    let cancelled = false;
    fetch(`/api/auth/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`)
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setExchanged(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [verifier]);

  const { data: session, isPending, refetch: refetchSession } = authClient.useSession();

  useEffect(() => {
    if (exchanged && verifier) {
      void refetchSession();
    }
  }, [exchanged, verifier, refetchSession]);

  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: exchanged && !!session?.user,
    retry: false,
  });

  useEffect(() => {
    if (oauthError) {
      window.location.href = `/sign-in?error=${encodeURIComponent(oauthError)}`;
      return;
    }
    if (!exchanged || isPending || (session?.user && tenantStatusQuery.isLoading)) return;

    const token = session?.session?.token;
    const isMobileClient =
      searchParams.get("platform") === "mobile" ||
      searchParams.get("source") === "mobile" ||
      searchParams.has("native");

    if (isMobileClient) {
      window.location.href = token
        ? `moneymatters://auth-callback?token=${encodeURIComponent(token)}`
        : "moneymatters://auth-callback";
      return;
    }

    if (!session?.user) {
      window.location.href = "/sign-in?error=oauth_failed";
      return;
    }

    const rawRedirect = searchParams.get("redirect") || searchParams.get("target") || "/dashboard";
    const redirectUrl =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : "/dashboard";

    // Invited partners must return to /invite/[token] to join the existing household
    if (redirectUrl.startsWith("/invite/")) {
      window.location.href = redirectUrl;
      return;
    }

    if (tenantStatusQuery.data && !tenantStatusQuery.data.hasTenant) {
      window.location.href = `/complete-profile?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    if (tenantStatusQuery.data && !tenantStatusQuery.data.setupCompleted) {
      window.location.href = "/setup";
      return;
    }

    window.location.href = redirectUrl;
  }, [
    oauthError,
    exchanged,
    session,
    isPending,
    tenantStatusQuery.isLoading,
    tenantStatusQuery.data,
    searchParams,
  ]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
      <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
      <p className="text-sm font-medium text-zinc-600">{t("common.completingAuth")}</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 gap-4">
          <div className="w-8 h-8 rounded-full border-2 border-[#2563eb] border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-zinc-600">{t("common.completingAuth")}</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
