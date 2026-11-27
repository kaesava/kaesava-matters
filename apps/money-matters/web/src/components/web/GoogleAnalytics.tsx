"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { ANALYTICS_CONSENT_KEY } from "./AnalyticsConsentBanner";

const GA_STREAM_IDS = (process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "")
  .split(",")
  .map((id) => id.trim())
  .filter(Boolean);

/**
 * Loads Google Web Stream tags (gtm.js) only when NEXT_PUBLIC_GA_MEASUREMENT_ID is set
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
