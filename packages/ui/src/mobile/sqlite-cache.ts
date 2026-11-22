import * as SQLite from "expo-sqlite";
import type { ZodType } from "zod";

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface ScopedSqliteCacheOptions {
  dbName: string;
  ttlMs?: number;
}

/**
 * Creates a tenant-and-user-scoped SQLite cache (`tenantId:userId:queryKey`) with Zod validation.
 */
export function createScopedSqliteCache({ dbName, ttlMs = DEFAULT_TTL_MS }: ScopedSqliteCacheOptions) {
  let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

  async function getDb(): Promise<SQLite.SQLiteDatabase> {
    if (!dbPromise) {
      dbPromise = (async () => {
        const db = await SQLite.openDatabaseAsync(dbName);
        await db.execAsync(
          "CREATE TABLE IF NOT EXISTS query_cache (cache_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);"
        );
        return db;
      })();
    }
    return dbPromise;
  }

  function buildKey(tenantId: string, userId: string, queryKey: string): string {
    return `${tenantId}:${userId}:${queryKey}`;
  }

  async function getCached<T>(
    tenantId: string,
    userId: string,
    queryKey: string,
    schema: ZodType<T>
  ): Promise<T | null> {
    try {
      const db = await getDb();
      const row = await db.getFirstAsync<{ payload: string; updated_at: number }>(
        "SELECT payload, updated_at FROM query_cache WHERE cache_key = ?",
        [buildKey(tenantId, userId, queryKey)]
      );
      if (!row || Date.now() - row.updated_at > ttlMs) return null;
      const parsed = schema.safeParse(JSON.parse(row.payload));
      return parsed.success ? parsed.data : null;
    } catch {
      return null;
    }
  }

  async function setCached<T>(tenantId: string, userId: string, queryKey: string, value: T): Promise<void> {
    try {
      const db = await getDb();
      await db.runAsync(
        "INSERT OR REPLACE INTO query_cache (cache_key, payload, updated_at) VALUES (?, ?, ?)",
        [buildKey(tenantId, userId, queryKey), JSON.stringify(value), Date.now()]
      );
    } catch {
      // Ignore cache write errors
    }
  }

  async function clearCache(): Promise<void> {
    try {
      const db = await getDb();
      await db.execAsync("DELETE FROM query_cache;");
    } catch {
      // Ignore cache clear errors
    }
  }

  return { getCached, setCached, clearCache };
}
