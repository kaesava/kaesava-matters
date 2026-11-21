import { Inngest } from "inngest";

/**
 * Platform-level scheduled notification hook.
 * App-specific scheduled notification crons (e.g., Money Matters weekly digest,
 * payday alert, bill alert) are registered by each app via `createTimezoneAwareNotificationCron`.
 */
export function createScheduledNotificationFunctions(_inngest: Inngest) {
  return [];
}
