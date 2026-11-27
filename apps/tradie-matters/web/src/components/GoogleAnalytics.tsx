"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { Button } from "@kaesava/ui/web";
import { t } from "@kaesava/i18n";

export const ANALYTICS_CONSENT_KEY = "mm_analytics_consent";

const GA_STREAM_IDS = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

export function GoogleAnalytics() {
  const [hasConsent, setHasConsent] = useState(false);

  useEffect(() => {
    const syncConsent = () => {
      try {
        setHasConsent(localStorage.getItem(ANALYTICS_CONSENT_KEY) === "granted");
      } catch {
        setHasConsent(false);
      }
    };

    syncConsent();
    window.addEventListener("mm-analytics-consent-changed", syncConsent);
    window.addEventListener("storage", syncConsent);
    return () => {
      window.removeEventListener("mm-analytics-consent-changed", syncConsent);
      window.removeEventListener("storage", syncConsent);
    };
  }, []);

  if (GA_STREAM_IDS.length === 0 || !hasConsent) {
    return null;
  }

  return (
    <>
      {GA_STREAM_IDS.map((streamId) => (
        <Script
          key={streamId}
          src={`https://www.googletagmanager.com/gtm.js?id=${streamId}`}
          strategy="afterInteractive"
        />
      ))}
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
        `}
      </Script>
    </>
  );
}

export function AnalyticsConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const syncVisibility = () => {
      try {
        const localConsent = localStorage.getItem(ANALYTICS_CONSENT_KEY);
        setVisible(localConsent !== "granted" && localConsent !== "denied");
      } catch {
        setVisible(false);
      }
    };

    syncVisibility();
    window.addEventListener("mm-analytics-consent-changed", syncVisibility);
    window.addEventListener("storage", syncVisibility);
    return () => {
      window.removeEventListener("mm-analytics-consent-changed", syncVisibility);
      window.removeEventListener("storage", syncVisibility);
    };
  }, []);

  const handleConsent = (granted: boolean) => {
    const value = granted ? "granted" : "denied";
    try {
      localStorage.setItem(ANALYTICS_CONSENT_KEY, value);
      window.dispatchEvent(new Event("mm-analytics-consent-changed"));
    } catch {
      // Ignore storage errors
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label={t("privacy.analyticsConsentTitle")}
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl flex flex-col gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("privacy.analyticsConsentTitle")}
        </h4>
        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          {t("privacy.analyticsConsentDesc")}
        </p>
      </div>

      <div className="flex items-center justify-end gap-2 pt-1">
        <Button type="button" variant="secondary" size="sm" onClick={() => handleConsent(false)}>
          {t("privacy.analyticsConsentDecline")}
        </Button>
        <Button type="button" variant="primary" size="sm" onClick={() => handleConsent(true)}>
          {t("privacy.analyticsConsentAccept")}
        </Button>
      </div>
    </div>
  );
}
