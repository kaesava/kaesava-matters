import posthog from "./posthog-client";

const ANALYTICS_CONSENT_KEY = "mm_analytics_consent";

interface GtagWindow extends Window {
  gtag?: (...args: unknown[]) => void;
}

/**
 * Dispatches opt-in product and conversion analytics events to PostHog and GA4.
 */
export function trackAnalyticsEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    if (window.localStorage?.getItem(ANALYTICS_CONSENT_KEY) !== "granted") {
      return;
    }
    posthog.capture(eventName, params);
    const gtag = (window as GtagWindow).gtag;
    if (typeof gtag === "function") {
      gtag("event", eventName, params ?? {});
    }
  } catch {
    // Ignore storage/analytics errors in restricted browsing contexts
  }
}
