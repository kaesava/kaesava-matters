import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "tradie-matters-api-service" });

export function syncInngestEventKey(eventKey?: string): void {
  if (!eventKey) return;
  const clientWithSetter = inngest as unknown as { setEventKey?: (key: string) => void };
  if (typeof clientWithSetter.setEventKey === "function") {
    clientWithSetter.setEventKey(eventKey);
  }
}

export const tradieHealthPing = inngest.createFunction(
  { id: "tradie-health-ping" },
  { event: "tradie/system.ping" },
  async () => ({ ok: true, app: "tradie-matters" })
);

export const functions = [tradieHealthPing];
