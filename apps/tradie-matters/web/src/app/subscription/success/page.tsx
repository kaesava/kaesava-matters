"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { t } from "@kaesava/i18n";
import { Button, Spinner } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import "../../../i18n";

function SubscriptionSuccessContent() {
  const router = useRouter();
  const sessionId = useSearchParams().get("session_id");
  const [verifying, setVerifying] = useState(Boolean(sessionId));
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const utils = trpc.useUtils();
  const verifyMutation = trpc.verifyCheckoutSession.useMutation();

  useEffect(() => {
    if (!sessionId || startedRef.current) return;
    startedRef.current = true;
    verifyMutation
      .mutateAsync({ sessionId })
      .then(async (res) => {
        if (res.verified) await utils.getSubscriptionStatus.invalidate();
      })
      .catch((err) => setVerificationError(err instanceof Error ? err.message : null))
      .finally(() => setVerifying(false));
  }, [sessionId, verifyMutation, utils]);

  useEffect(() => {
    if (!verifying) {
      const timer = setTimeout(() => router.push("/dashboard"), 3000);
      return () => clearTimeout(timer);
    }
  }, [verifying, router]);

  return (
    <main className="min-h-screen bg-[#F7F8FA] flex items-center justify-center p-6 text-center">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-slate-100 flex flex-col items-center gap-6">
        {verifying ? (
          <>
            <Spinner size="lg" />
            <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("subscription.verifyingTitle")}</h1>
            <p className="text-sm text-slate-600">{t("subscription.verifyingSubtitle")}</p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("subscription.verifiedSuccessTitle")}</h1>
            <p className="text-sm text-slate-600">
              {verificationError ? t("subscription.verifyingDelayedNotice") : t("subscription.verifiedSuccessSubtitle")}
            </p>
            <Button type="button" onClick={() => router.push("/dashboard")} className="w-full">
              {t("subscription.goToDashboardCta")}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

export default function SubscriptionSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F7F8FA] flex items-center justify-center"><Spinner size="lg" /></div>}>
      <SubscriptionSuccessContent />
    </Suspense>
  );
}
