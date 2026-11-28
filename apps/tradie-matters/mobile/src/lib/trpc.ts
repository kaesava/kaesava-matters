import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import * as SecureStore from "expo-secure-store";
import { createScopedSqliteCache } from "@kaesava/ui/mobile";
import type { TradieMobileRouter } from "./trpc-types";
import { authClient } from "./auth";
import { logger } from "./logger";

export const trpc = createTRPCReact<TradieMobileRouter>();

const TRADIE_APP_ID = "5cb11fa2-7faf-49d3-9e3a-01f14d2a7b99";
const TENANT_STORAGE_KEY = "tradie_matters_active_tenant_id";
const SESSION_TOKEN_KEY = "tradie-matters_session_token";
const COOKIE_STORAGE_KEY = "tradie-matters_cookie";
const SESSION_DATA_KEY = "tradie-matters_session_data";
const DEV_API_URL = "http://localhost:3011";
const PROD_API_URL = "https://api.tradiematters.kaesava.au";

export const sqliteCache = createScopedSqliteCache({ dbName: "tradie_matters_cache.db" });
let activeSessionToken: string | null = null;
let activeTenantId: string | null = null;

function resolveApiBaseUrl(): string {
  const envUrl = process.env["EXPO_PUBLIC_API_URL"];
  const isDev = typeof __DEV__ !== "undefined" ? __DEV__ : process.env["NODE_ENV"] !== "production";
  return envUrl || (isDev ? DEV_API_URL : PROD_API_URL);
}

export const API_BASE_URL = resolveApiBaseUrl();

export function setActiveSessionToken(token: string | null): void {
  activeSessionToken = token;
  if (!token) sqliteCache.clearCache().catch(() => {});
}

export function getActiveSessionToken(): string | null {
  return activeSessionToken;
}

export function setActiveTenantId(tenantId: string | null): void {
  activeTenantId = tenantId;
  if (tenantId) {
    SecureStore.setItemAsync(TENANT_STORAGE_KEY, tenantId).catch(() => {});
  } else {
    SecureStore.deleteItemAsync(TENANT_STORAGE_KEY).catch(() => {});
    sqliteCache.clearCache().catch(() => {});
  }
}

export function getActiveTenantId(): string | null {
  return activeTenantId;
}

export async function switchActiveTenant(
  tenantId: string,
  utils?: { invalidate?: () => Promise<unknown> | void }
): Promise<void> {
  await sqliteCache.clearCache().catch(() => {});
  setActiveTenantId(tenantId);
  if (typeof utils?.invalidate === "function") {
    try {
      await utils.invalidate();
    } catch (err: unknown) {
      logger.warn("[switchActiveTenant] Invalidation failed:", err);
    }
  }
}

async function readCookieStorage(): Promise<{ token: string | null; cookie: string | null }> {
  try {
    const raw = await SecureStore.getItemAsync(COOKIE_STORAGE_KEY);
    if (!raw) return { token: null, cookie: null };
    const parsed = JSON.parse(raw) as Record<string, { value?: string; expires?: string }>;
    const parts: string[] = [];
    let token: string | null = null;
    for (const [key, obj] of Object.entries(parsed)) {
      if (!obj?.value) continue;
      if (obj.expires && new Date(obj.expires).getTime() <= Date.now()) continue;
      parts.push(`${key}=${obj.value}`);
      if (key.includes("session_token")) {
        const extracted = obj.value.split(".")[0]?.replace(/^(?:s:|s_|s%3A)/, "");
        if (extracted) token = extracted;
      }
    }
    return { token, cookie: parts.length > 0 ? parts.join("; ") : null };
  } catch {
    return { token: null, cookie: null };
  }
}

export async function getStoredTokenAndCookie(): Promise<{ token: string | null; cookie: string | null }> {
  let { token, cookie } = await readCookieStorage();
  if (!cookie) {
    try {
      cookie = (authClient as unknown as { getCookie?: () => string }).getCookie?.() || null;
    } catch {
      cookie = null;
    }
  }
  if (!token) {
    try {
      const res = await authClient.getSession();
      const data = res?.data as { session?: { token?: string }; token?: string } | undefined;
      const resolved = data?.session?.token || data?.token;
      if (resolved) {
        token = resolved;
        await SecureStore.setItemAsync(SESSION_TOKEN_KEY, resolved).catch(() => {});
      }
    } catch {
      // Offline / network failure
    }
  }
  if (!token) {
    try {
      const raw = await SecureStore.getItemAsync(SESSION_DATA_KEY);
      const parsed = raw ? (JSON.parse(raw) as { session?: { token?: string }; token?: string }) : null;
      token = parsed?.session?.token || parsed?.token || null;
    } catch {
      token = null;
    }
  }
  if (!token) {
    token = (await SecureStore.getItemAsync(SESSION_TOKEN_KEY).catch(() => null)) || null;
  }
  return { token, cookie };
}

async function fetchWithRefresh(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12_000);
  try {
    let res = await fetch(url, { ...options, signal: controller.signal });
    if (res.status === 401) {
      setActiveSessionToken(null);
      await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => {});
      const stored = await getStoredTokenAndCookie();
      if (stored.token) {
        setActiveSessionToken(stored.token);
        const headers: Record<string, string> = {
          ...((options?.headers as Record<string, string>) || {}),
          Authorization: `Bearer ${stored.token}`,
        };
        if (stored.cookie) headers["cookie"] = stored.cookie;
        res = await fetch(url, { ...options, headers, signal: controller.signal });
      }
    }
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function buildTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${API_BASE_URL}/trpc`,
        fetch: fetchWithRefresh,
        async headers() {
          const { token: storedToken, cookie } = await getStoredTokenAndCookie();
          const token = storedToken || getActiveSessionToken();
          if (token) setActiveSessionToken(token);
          const tenantId =
            getActiveTenantId() || (await SecureStore.getItemAsync(TENANT_STORAGE_KEY).catch(() => null));
          if (tenantId) setActiveTenantId(tenantId);

          const headersObj: Record<string, string> = {
            "x-app-id": process.env["EXPO_PUBLIC_APP_ID"] || TRADIE_APP_ID,
          };
          if (token) headersObj["Authorization"] = `Bearer ${token}`;
          if (cookie) headersObj["cookie"] = cookie;
          if (tenantId) headersObj["x-tenant-id"] = tenantId;
          return headersObj;
        },
      }),
    ],
  });
}
