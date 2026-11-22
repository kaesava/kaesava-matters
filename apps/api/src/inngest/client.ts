import { Inngest } from "inngest";
import { resolveAppConfigOrDefault } from "@kaesava/config";

const appManifest = resolveAppConfigOrDefault();

export const inngest = new Inngest({
  id: appManifest.inngestAppId || `${appManifest.slug}-api-service`,
});

/**
 * Syncs Cloudflare Worker runtime INNGEST_EVENT_KEY onto the module-scoped Inngest client
 * after env bindings are hydrated inside fetch().
 */
export function syncInngestEventKey(eventKey?: string): void {
  if (!eventKey) return;
  const clientWithSetter = inngest as unknown as { setEventKey?: (key: string) => void };
  if (typeof clientWithSetter.setEventKey === "function") {
    clientWithSetter.setEventKey(eventKey);
  }
}
