export interface TelemetryClientLike {
  capture: (payload: {
    distinctId: string;
    event: string;
    properties?: Record<string, unknown>;
  }) => void;
  identify: (payload: {
    distinctId: string;
    properties?: Record<string, unknown>;
  }) => void;
  flush: () => Promise<void>;
}

export interface ConsentGatedTelemetryDeps<TDb> {
  client: TelemetryClientLike | null;
  isUserTelemetryGranted: (db: TDb, userId: string) => Promise<boolean>;
  appId?: string;
  appSlug?: string;
}

export function createConsentGatedTelemetry<TDb>(deps: ConsentGatedTelemetryDeps<TDb>) {
  async function captureIfConsented(
    db: TDb,
    userId: string | null | undefined,
    event: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!deps.client || !userId) return;
    try {
      if (!(await deps.isUserTelemetryGranted(db, userId))) return;
      const enriched = {
        ...(deps.appId ? { app_id: deps.appId } : {}),
        ...(deps.appSlug ? { app_slug: deps.appSlug } : {}),
        ...properties,
      };
      deps.client.capture({ distinctId: userId, event, properties: enriched });
      await deps.client.flush();
    } catch {
      // Never let telemetry errors break API mutations
    }
  }

  async function identifyIfConsented(
    db: TDb,
    userId: string | null | undefined,
    properties?: Record<string, unknown>
  ): Promise<void> {
    if (!deps.client || !userId) return;
    try {
      if (!(await deps.isUserTelemetryGranted(db, userId))) return;
      deps.client.identify({ distinctId: userId, properties });
      await deps.client.flush();
    } catch {
      // Never let telemetry errors break API mutations
    }
  }

  return { captureIfConsented, identifyIfConsented };
}
