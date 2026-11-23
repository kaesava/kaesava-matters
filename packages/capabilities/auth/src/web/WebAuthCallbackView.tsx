"use client";

import React, { useEffect } from "react";
import { t } from "@kaesava/i18n";
import { Spinner } from "@kaesava/ui/web";

export interface WebAuthCallbackViewProps {
  defaultRedirect?: string;
}

export function WebAuthCallbackView({ defaultRedirect = "/dashboard" }: WebAuthCallbackViewProps) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    if (oauthError) {
      window.location.href = `/sign-in?error=${encodeURIComponent(oauthError)}`;
      return;
    }

    const verifier = params.get("neon_auth_session_verifier");
    const rawRedirect = params.get("redirect") || defaultRedirect;
    const safeRedirect =
      rawRedirect.startsWith("/") && !rawRedirect.startsWith("//") ? rawRedirect : defaultRedirect;

    async function completeAuth() {
      const url = verifier
        ? `/api/auth/get-session?neon_auth_session_verifier=${encodeURIComponent(verifier)}`
        : "/api/auth/get-session";
      try {
        const res = await fetch(url, { credentials: "include" });
        const payload = (await res.json().catch(() => null)) as { user?: { id?: string } } | null;
        if (payload?.user?.id) {
          window.location.href = safeRedirect;
          return;
        }
      } catch {
        // Fall through to sign-in error
      }
      window.location.href = "/sign-in?error=oauth_failed";
    }

    void completeAuth();
  }, [defaultRedirect]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm font-medium text-slate-600">{t("common.loading")}</p>
    </div>
  );
}
