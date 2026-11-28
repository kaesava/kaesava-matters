import posthog from "posthog-js";

const isProduction = process.env.NODE_ENV === "production";
const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

if (isProduction && projectToken) {
  const isConsentGranted =
    typeof window !== "undefined" &&
    window.localStorage?.getItem("mm_analytics_consent") === "granted";

  posthog.init(projectToken, {
    api_host: host || "/ingest",
    defaults: "2026-01-30",
    capture_exceptions: false,
    disable_session_recording: true,
    opt_out_capturing_by_default: !isConsentGranted,
  });
}

export default posthog;
