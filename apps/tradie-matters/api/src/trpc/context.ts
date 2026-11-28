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
} from "@kaesava/core/trpc";
import { TRADIE_MATTERS_APP_ID } from "../manifest.js";

export interface EdgeContextEnv extends BaseEdgeContextEnv {
  TRADIE_MATTERS_APP_ID?: string;
}

const factory = createAppEdgeContextFactory({
  defaultAppId: TRADIE_MATTERS_APP_ID,
  resolveEnvAppId: (env) => (env as EdgeContextEnv | undefined)?.TRADIE_MATTERS_APP_ID,
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
