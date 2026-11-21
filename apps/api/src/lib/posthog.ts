import { PostHog } from "posthog-node";
import type { DbOrTx } from "@money-matters/db";
import { createConsentGatedTelemetry } from "@money-matters/core";
import { isUserTelemetryGranted } from "@money-matters/capability-tenant";

const isProduction = process.env.NODE_ENV === "production";
const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

if (isProduction && !apiKey) {
  console.warn(
    "[PostHog] POSTHOG_API_KEY is missing in production — events will not be captured."
  );
}

export const posthog: PostHog | null =
  isProduction && apiKey
    ? new PostHog(apiKey, {
        host: host || "https://us.i.posthog.com",
        flushAt: 20,
        flushInterval: 10000,
        enableExceptionAutocapture: false,
      })
    : null;

const telemetry = createConsentGatedTelemetry<DbOrTx>({
  client: posthog,
  isUserTelemetryGranted,
});

export const captureIfConsented = telemetry.captureIfConsented;
export const identifyIfConsented = telemetry.identifyIfConsented;
