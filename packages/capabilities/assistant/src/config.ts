export interface AssistantAppConfig<TContextSnapshot = Record<string, unknown>> {
  /** Branded persona name (e.g., "Penny" for Money Matters, "TradieBot" for TradieMatters). */
  personaName: string;
  systemPrompt: string;
  allowedRoutes: readonly string[];
  monthlyFreeQuota: number;
  monthlyPaidQuota: number;
  buildContextSnapshot: (params: {
    tenantId: string;
    userId: string;
    appId: string;
  }) => Promise<TContextSnapshot>;
}
