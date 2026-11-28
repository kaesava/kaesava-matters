import {
  createAppEdgeContextFactory,
  extractCorrelationId,
  extractAuthToken,
  buildNeonAuthCookieHeader,
  clearEdgeContextCache,
  resolveClaimsFromDatabase,
  resolveClaimsFromNeonAuth,
  type EdgeContextEnv as BaseEdgeContextEnv,
  type ResolvedClaims,
} from '@kaesava/core/trpc';

export const MONEY_MATTERS_APP_ID = '01908bde-34bb-7b19-a178-574211bc93aa';

export interface EdgeContextEnv extends BaseEdgeContextEnv {
  MONEY_MATTERS_APP_ID?: string;
}

const factory = createAppEdgeContextFactory({
  defaultAppId: MONEY_MATTERS_APP_ID,
  resolveEnvAppId: (env) => (env as EdgeContextEnv | undefined)?.MONEY_MATTERS_APP_ID,
});

export const { resolveRequestAppId, resolveTenantMembership, createEdgeContext } = factory;

export {
  extractCorrelationId,
  extractAuthToken,
  buildNeonAuthCookieHeader,
  clearEdgeContextCache,
  resolveClaimsFromDatabase,
  resolveClaimsFromNeonAuth,
};

export type { ResolvedClaims };
export type EdgeContext = Awaited<ReturnType<typeof createEdgeContext>>;
