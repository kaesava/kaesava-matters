import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { resolveAppConfig } from "@kaesava/config";
import { tenantUsers, tenants, type DbClient } from "@kaesava/db/rings/platform";
import { eq, and, isNull, sql, asc } from "drizzle-orm";
import { verifyJwt } from "../auth.js";
import { createDbClient } from "../db-client.js";
import { logger } from "../logger.js";
import { upsertUserFromJwt } from "../user-sync.js";

export interface EdgeContextEnv {
  DATABASE_URL?: string;
  NEON_AUTH_BASE_URL?: string;
  NEON_AUTH_JWKS_URL?: string;
  DEFAULT_APP_ID?: string;
}

export interface ResolvedClaims {
  userId: string;
  email: string;
  displayName?: string;
}

export interface EdgeSession {
  userId: string;
  email: string;
  displayName: string | undefined;
  tenantId: string | null;
  appId: string;
  role: string | null;
  appRole?: string | null;
}

export interface ResolvedTenantMembership {
  tenantId: string | null;
  role: string | null;
  appRole: string | null;
  appId: string;
}

export interface EdgeContext {
  req: Request;
  resHeaders: Headers | undefined;
  db: DbClient;
  session: EdgeSession | null;
  userId: string | null;
  tenantId: string | null;
  email: string | null;
  appId: string | null;
  correlationId: string;
}

export interface AppEdgeContextFactory {
  resolveRequestAppId: (req: Request, env?: EdgeContextEnv) => string;
  resolveTenantMembership: (
    requestDb: DbClient,
    claims: ResolvedClaims,
    requestedTenantId: string | null,
    correlationId: string,
    targetAppId?: string
  ) => Promise<ResolvedTenantMembership>;
  createEdgeContext: (opts: FetchCreateContextFnOptions, env?: EdgeContextEnv) => Promise<EdgeContext>;
  clearEdgeContextCache: () => void;
}

export interface CreateAppEdgeContextOptions {
  defaultAppId: string;
  resolveEnvAppId?: (env?: EdgeContextEnv) => string | undefined;
}

const SESSION_COOKIE_PRIORITY = [
  "__Secure-neon-auth.session_token",
  "neon-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session_token",
  "neon_auth_session",
] as const;

interface CachedSessionClaims {
  claims: ResolvedClaims;
  cachedAt: number;
}

interface CachedTenantMembership {
  membership: ResolvedTenantMembership;
  cachedAt: number;
}

const sessionClaimsMemoryCache = new Map<string, CachedSessionClaims>();
const tenantMembershipMemoryCache = new Map<string, CachedTenantMembership>();
const EDGE_CACHE_TTL_MS = 30_000;

/** Clears in-memory session claims and tenant membership caches. */
export function clearEdgeContextCache(): void {
  sessionClaimsMemoryCache.clear();
  tenantMembershipMemoryCache.clear();
}

/** Extracts correlation ID from request header or generates a new UUID and sets it on resHeaders. */
export function extractCorrelationId(req: Request, resHeaders?: Headers): string {
  const correlationId = req.headers.get("x-correlation-id") || crypto.randomUUID();
  if (resHeaders) {
    resHeaders.set("x-correlation-id", correlationId);
  }
  return correlationId;
}

/** Extracts bearer token or Neon Auth session cookie from request headers. */
export function extractAuthToken(req: Request): string {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.split(" ")[1] ?? "";
  if (bearer) return bearer;

  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return "";
  const pairs = cookieHeader.split(";").map((p) => p.trim());
  for (const cookieName of SESSION_COOKIE_PRIORITY) {
    const prefix = `${cookieName}=`;
    const hit = pairs.find((p) => p.startsWith(prefix));
    if (hit) return decodeURIComponent(hit.slice(prefix.length));
  }
  return "";
}

/** Normalizes cookie headers for Neon Auth verification, mapping local dev cookies to __Secure- cookies. */
export function buildNeonAuthCookieHeader(req: Request, token: string): string | null {
  const rawCookie = req.headers.get("cookie");
  if (rawCookie) {
    let mapped = rawCookie;
    if (mapped.includes("neon-auth.session_token=") && !mapped.includes("__Secure-neon-auth.session_token=")) {
      mapped = mapped.replace(/neon-auth\.session_token=/g, "__Secure-neon-auth.session_token=");
    }
    if (mapped.includes("better-auth.session_token=") && !mapped.includes("__Secure-better-auth.session_token=")) {
      mapped = mapped.replace(/better-auth\.session_token=/g, "__Secure-better-auth.session_token=");
    }
    return mapped;
  }
  return token
    ? `__Secure-neon-auth.session_token=${encodeURIComponent(token)}; neon-auth.session_token=${encodeURIComponent(token)}`
    : null;
}

async function queryDbSessionRow(
  requestDb: DbClient,
  token: string,
  cleanToken: string,
  rawToken: string
): Promise<{ userId: string; email: string; name: string } | undefined> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("DB session lookup timed out after 10000ms")), 10_000);
  });
  const queryPromise = requestDb.execute<{ userId: string; email: string; name: string }>(
    sql`SELECT s."userId" as "userId", u.email as "email", u.name as "name"
        FROM neon_auth.session s
        JOIN neon_auth.user u ON s."userId" = u.id
        WHERE (s.token = ${token} OR s.token = ${cleanToken} OR s.token = ${rawToken})
          AND s."expiresAt" > NOW()
        LIMIT 1`
  );
  const dbSessions = await Promise.race([queryPromise, timeoutPromise]);
  const rows = Array.isArray(dbSessions)
    ? dbSessions
    : (dbSessions as { rows: { userId: string; email: string; name: string }[] }).rows;
  return rows?.[0];
}

/** Fallback: resolves session claims directly from neon_auth.session with a 10s timeout. */
export async function resolveClaimsFromDatabase(
  token: string,
  requestDb: DbClient,
  correlationId: string
): Promise<ResolvedClaims | null> {
  const rawToken = token.replace(/^s:/, "");
  const cleanToken = rawToken.split(".")[0];
  const now = Date.now();
  const cached = sessionClaimsMemoryCache.get(cleanToken);
  if (cached && now - cached.cachedAt < EDGE_CACHE_TTL_MS) return cached.claims;

  try {
    const dbSession = await queryDbSessionRow(requestDb, token, cleanToken, rawToken);
    if (!dbSession) {
      logger.warn("DB session SQL query returned 0 rows", { correlationId, tokenSnippet: token.substring(0, 10) });
      return null;
    }
    const claims: ResolvedClaims = { userId: dbSession.userId, email: dbSession.email, displayName: dbSession.name };
    if (sessionClaimsMemoryCache.size > 500) sessionClaimsMemoryCache.clear();
    sessionClaimsMemoryCache.set(cleanToken, { claims, cachedAt: now });
    return claims;
  } catch (err: unknown) {
    logger.error("Database session lookup failed in edge context", { correlationId, err });
    return null;
  }
}

async function fetchNeonAuthSession(
  authBase: string,
  req: Request,
  cookieHeader: string | null,
  correlationId: string
): Promise<{ user?: { id?: string; email?: string; name?: string } | null } | null> {
  const authHeader = req.headers.get("authorization");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${authBase}/get-session`, {
      headers: {
        ...(cookieHeader ? { cookie: cookieHeader } : {}),
        ...(authHeader ? { authorization: authHeader } : {}),
        "x-correlation-id": correlationId,
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      logger.warn("Neon Auth /get-session returned non-OK status", { correlationId, status: res.status });
      return null;
    }
    return (await res.json()) as { user?: { id?: string; email?: string; name?: string } | null } | null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Fallback: verifies session with Neon Auth /get-session endpoint using a 10s AbortController timeout. */
export async function resolveClaimsFromNeonAuth(
  req: Request,
  env: EdgeContextEnv | undefined,
  correlationId: string
): Promise<ResolvedClaims | null> {
  const authBase = env?.NEON_AUTH_BASE_URL || process.env.NEON_AUTH_BASE_URL;
  if (!authBase) {
    logger.warn("Neon Auth base URL is not configured in env", { correlationId });
    return null;
  }
  const token = extractAuthToken(req);
  const cookieHeader = buildNeonAuthCookieHeader(req, token);
  if (!cookieHeader && !req.headers.get("authorization")) return null;

  try {
    const sessionData = await fetchNeonAuthSession(authBase, req, cookieHeader, correlationId);
    if (!sessionData?.user?.id || !sessionData.user.email) return null;
    const resolved: ResolvedClaims = {
      userId: sessionData.user.id,
      email: sessionData.user.email,
      displayName: sessionData.user.name ?? undefined,
    };
    if (token) {
      sessionClaimsMemoryCache.set(token.replace(/^s:/, "").split(".")[0], { claims: resolved, cachedAt: Date.now() });
    }
    return resolved;
  } catch (err: unknown) {
    logger.error("Neon Auth endpoint fallback lookup failed", { correlationId, err });
    return null;
  }
}

async function queryUserMemberships(requestDb: DbClient, userId: string, targetAppId: string) {
  return requestDb
    .select({
      tenantId: tenantUsers.tenantId,
      role: tenantUsers.role,
      appRole: tenantUsers.appRole,
      appId: tenants.appId,
    })
    .from(tenantUsers)
    .innerJoin(tenants, eq(tenantUsers.tenantId, tenants.id))
    .where(
      and(
        eq(tenantUsers.userId, userId),
        eq(tenants.appId, targetAppId),
        eq(tenantUsers.inviteStatus, "ACCEPTED"),
        isNull(tenantUsers.archivedAt)
      )
    )
    .orderBy(sql`CASE WHEN ${tenantUsers.role} = 'OWNER' THEN 0 ELSE 1 END`, asc(tenantUsers.createdAt));
}

/** Resolves tenant membership for authenticated claims, returning null tenantId for onboarding users. */
export async function resolveTenantMembership(
  requestDb: DbClient,
  claims: ResolvedClaims,
  requestedTenantId: string | null,
  _correlationId: string,
  targetAppId: string
): Promise<ResolvedTenantMembership> {
  const cacheKey = `${claims.userId}:${targetAppId}:${requestedTenantId ?? ""}`;
  const now = Date.now();
  const cached = tenantMembershipMemoryCache.get(cacheKey);
  if (cached && now - cached.cachedAt < EDGE_CACHE_TTL_MS) return cached.membership;

  await upsertUserFromJwt(claims.userId, claims.email, claims.displayName, requestDb);
  const memberships = await queryUserMemberships(requestDb, claims.userId, targetAppId);
  const matched = requestedTenantId ? memberships.find((m) => m.tenantId === requestedTenantId) : undefined;
  const membership = matched ?? memberships[0];

  if (!membership?.tenantId) {
    return { tenantId: null, role: null, appRole: null, appId: targetAppId };
  }
  const resolved: ResolvedTenantMembership = {
    tenantId: membership.tenantId,
    role: membership.role ?? null,
    appRole: membership.appRole ?? null,
    appId: membership.appId ?? targetAppId,
  };
  if (tenantMembershipMemoryCache.size > 500) tenantMembershipMemoryCache.clear();
  tenantMembershipMemoryCache.set(cacheKey, { membership: resolved, cachedAt: now });
  return resolved;
}

async function resolveClaimsWithFallbacks(
  req: Request,
  requestDb: DbClient,
  env: EdgeContextEnv | undefined,
  correlationId: string
): Promise<ResolvedClaims | null> {
  const token = extractAuthToken(req);
  if (!token) return null;
  let claims = await verifyJwt(token, env);
  if (!claims) claims = await resolveClaimsFromDatabase(token, requestDb, correlationId);
  if (!claims) claims = await resolveClaimsFromNeonAuth(req, env, correlationId);
  return claims;
}

/** Creates an app-scoped edge context factory with correlation tracing, DB pooling, and session fallbacks. */
export function createAppEdgeContextFactory(options: CreateAppEdgeContextOptions): AppEdgeContextFactory {
  function resolveRequestAppId(req: Request, env?: EdgeContextEnv): string {
    const headerAppId = req.headers.get("x-app-id")?.trim();
    if (headerAppId && resolveAppConfig(headerAppId)) return headerAppId;
    return options.resolveEnvAppId?.(env) || env?.DEFAULT_APP_ID || options.defaultAppId;
  }

  async function resolveAppTenantMembership(
    requestDb: DbClient,
    claims: ResolvedClaims,
    requestedTenantId: string | null,
    correlationId: string,
    targetAppId: string = options.defaultAppId
  ): Promise<ResolvedTenantMembership> {
    return resolveTenantMembership(requestDb, claims, requestedTenantId, correlationId, targetAppId);
  }

  async function createEdgeContext(
    { req, resHeaders }: FetchCreateContextFnOptions,
    env?: EdgeContextEnv
  ): Promise<EdgeContext> {
    const correlationId = extractCorrelationId(req, resHeaders);
    const connectionString = env?.DATABASE_URL || process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not configured in environment.");
    const requestDb = createDbClient(connectionString);
    const claims = await resolveClaimsWithFallbacks(req, requestDb, env, correlationId);

    if (!claims) {
      return {
        req,
        resHeaders,
        db: requestDb,
        session: null,
        userId: null,
        tenantId: null,
        email: null,
        appId: null,
        correlationId,
      };
    }

    const requestedTenantId = req.headers.get("x-tenant-id") ?? req.headers.get("x-active-tenant") ?? null;
    const resolvedAppId = resolveRequestAppId(req, env);
    const { tenantId, role, appRole, appId } = await resolveAppTenantMembership(
      requestDb,
      claims,
      requestedTenantId || null,
      correlationId,
      resolvedAppId
    );
    const session: EdgeSession = {
      userId: claims.userId,
      email: claims.email,
      displayName: claims.displayName,
      tenantId,
      appId,
      role,
      appRole,
    };

    return { req, resHeaders, db: requestDb, session, userId: claims.userId, tenantId, email: claims.email, appId, correlationId };
  }

  return {
    resolveRequestAppId,
    resolveTenantMembership: resolveAppTenantMembership,
    createEdgeContext,
    clearEdgeContextCache,
  };
}
