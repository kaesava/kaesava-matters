"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { ANALYTICS_CONSENT_KEY } from "./AnalyticsConsentBanner";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/**
 * Loads Google Analytics 4 (gtag.js) only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
 * and the user has explicitly granted analytics consent.
 */
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

  if (!GA_MEASUREMENT_ID || !hasConsent) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
