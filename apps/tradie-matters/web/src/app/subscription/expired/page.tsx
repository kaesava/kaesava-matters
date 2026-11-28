"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button } from "@kaesava/ui/web";
import { authClient } from "../../../lib/auth";
import { TradiePublicHeader } from "../../../components/TradiePublicHeader";
import { TradiePublicFooter } from "../../../components/TradiePublicFooter";
import "../../../i18n";

export default function SubscriptionExpiredPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/sign-in");
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col justify-between">
      <TradiePublicHeader />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.subscriptionExpiredTitle")}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{t("tradieWeb.subscriptionExpiredSubtitle")}</p>
          <div className="flex flex-col gap-3 pt-2">
            <Button type="button" onClick={() => router.push("/subscription/upgrade")} className="w-full">
              {t("tradieWeb.subscriptionExpiredCta")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleSignOut} className="w-full">
              {t("settings.signOut")}
            </Button>
          </div>
        </div>
      </main>
      <TradiePublicFooter />
    </div>
  );
}
