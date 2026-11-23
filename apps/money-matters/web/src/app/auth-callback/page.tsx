"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authClient } from "../../lib/auth";
import { trpc } from "../../lib/trpc";
import { t } from "@kaesava/i18n";

interface ExchangedSessionPayload {
  user?: { id?: string } | null;
  session?: { token?: string } | null;
}

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const verifier = searchParams.get("neon_auth_session_verifier");
  const oauthError = searchParams.get("error");

  const { data: session, isPending, refetch: refetchSession } = authClient.useSession();
  const [exchangeDone, setExchangeDone] = useState(!verifier);
  const [exchangedPayload, setExchangedPayload] = useState<ExchangedSessionPayload | null>(null);

  useEffect(() => {
    if (!verifier) return;
    let cancelled = false;

    async function exchangeVerifier() {
      try {
        const res = await fetch(
          `/api/auth/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier!)}`,
          { credentials: "include" }
        );
        if (res.ok) {
          const payload = (await res.json()) as ExchangedSessionPayload;
          if (!cancelled && payload) {
            setExchangedPayload(payload);
          }
        }
      } catch {
        // Fallback to refetchSession below
      }

      try {
        await refetchSession();
      } catch {
        // Non-blocking; exchangedPayload still holds the verified session
      }

      if (!cancelled) {
        setExchangeDone(true);
      }
    }

    void exchangeVerifier();
    return () => {
      cancelled = true;
    };
  }, [verifier, refetchSession]);

  const activeUser = exchangedPayload?.user ?? session?.user ?? null;
  const activeToken = exchangedPayload?.session?.token ?? session?.session?.token ?? null;

  const tenantStatusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: exchangeDone && !!activeUser,
    retry: false,
  });

  useEffect(() => {
    if (oauthError) {
      // Full page reload required to refresh auth/session state
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/sign-in?error=${encodeURIComponent(oauthError)}`;
      return;
    }
    if (!exchangeDone || (!exchangedPayload && isPending) || (activeUser && tenantStatusQuery.isLoading)) {
      return;
    }

    const isMobileClient =
      searchParams.get("platform") === "mobile" ||
      searchParams.get("source") === "mobile" ||
      searchParams.has("native");

    if (isMobileClient) {
      window.location.href = activeToken
        ? `moneymatters://auth-callback?token=${encodeURIComponent(activeToken)}`
        : "moneymatters://auth-callback";
      return;
    }

    if (!activeUser) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
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
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/complete-profile?redirect=${encodeURIComponent(redirectUrl)}`;
      return;
    }

    if (tenantStatusQuery.data && !tenantStatusQuery.data.setupCompleted) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/setup";
      return;
    }

    window.location.href = redirectUrl;
  }, [
    oauthError,
    exchangeDone,
    exchangedPayload,
    activeUser,
    activeToken,
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
