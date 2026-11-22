import { resolveAppConfigOrDefault } from "@money-matters/config";

export interface TrpcEdgeProxyConfig {
  appId?: string;
  apiBaseUrl: string;
}

/**
 * Builds forwarded headers for a Next.js / Edge `/api/trpc/[trpc]` proxy route,
 * ensuring `x-app-id`, `x-tenant-id`, `cookie`, and `authorization` are preserved.
 */
export function buildTrpcProxyHeaders(
  incomingHeaders: Headers,
  config: TrpcEdgeProxyConfig
): Headers {
  const appConfig = resolveAppConfigOrDefault(config.appId);
  const forwarded = new Headers();
  const contentType = incomingHeaders.get("content-type");
  if (contentType) forwarded.set("content-type", contentType);

  const cookie = incomingHeaders.get("cookie");
  if (cookie) forwarded.set("cookie", cookie);

  const authorization = incomingHeaders.get("authorization");
  if (authorization) forwarded.set("authorization", authorization);

  const tenantId = incomingHeaders.get("x-tenant-id");
  if (tenantId) forwarded.set("x-tenant-id", tenantId);

  forwarded.set("x-app-id", incomingHeaders.get("x-app-id") || appConfig.id);
  return forwarded;
}
