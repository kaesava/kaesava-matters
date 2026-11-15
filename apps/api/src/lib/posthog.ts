import { PostHog } from 'posthog-node';
import type { DbOrTx } from '@money-matters/db';
import { isUserTelemetryGranted } from '@money-matters/capability-tenant';

const isProduction = process.env.NODE_ENV === 'production';
const apiKey = process.env.POSTHOG_API_KEY;
const host = process.env.POSTHOG_HOST;

// Only instantiate PostHog in production. Dev/staging traffic must never
// reach production analytics, and the wizard-generated error logs would
// spam local console output every restart.
if (!isProduction && !apiKey) {
  // Silent in development — absence of the key is expected.
}

if (isProduction && !apiKey) {
  console.warn(
    '[PostHog] POSTHOG_API_KEY is missing in production — events will not be captured.'
  );
}

export const posthog: PostHog | null =
  isProduction && apiKey
    ? new PostHog(apiKey, {
        host: host || 'https://us.i.posthog.com',
        flushAt: 20,
        flushInterval: 10000,
        enableExceptionAutocapture: false,
      })
    : null;

/**
 * Captures a PostHog event on the server only when the user has explicitly granted
 * Anonymous Product Telemetry consent (`user_preferences.telemetry_consent = 'granted'`).
 */
export async function captureIfConsented(
  db: DbOrTx,
  userId: string | null | undefined,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!posthog || !userId) return;
  try {
    if (!(await isUserTelemetryGranted(db, userId))) return;
    posthog.capture({ distinctId: userId, event, properties });
    await posthog.flush();
  } catch {
    // Never let telemetry errors break API mutations
  }
}

/**
 * Identifies a user in PostHog on the server only when telemetry consent is explicitly granted.
 */
export async function identifyIfConsented(
  db: DbOrTx,
  userId: string | null | undefined,
  properties?: Record<string, unknown>
): Promise<void> {
  if (!posthog || !userId) return;
  try {
    if (!(await isUserTelemetryGranted(db, userId))) return;
    posthog.identify({ distinctId: userId, properties });
    await posthog.flush();
  } catch {
    // Never let telemetry errors break API mutations
  }
}
