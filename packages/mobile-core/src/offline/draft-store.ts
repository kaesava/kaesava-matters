import { useCallback, useEffect, useRef, useState } from "react";
import * as SQLite from "expo-sqlite";

const DEFAULT_DB_NAME = "kaesava_offline.db";
const DEFAULT_DEBOUNCE_MS = 150;
const dbCache = new Map<string, Promise<SQLite.SQLiteDatabase>>();

async function getDraftDb(dbName: string = DEFAULT_DB_NAME): Promise<SQLite.SQLiteDatabase> {
  const existing = dbCache.get(dbName);
  if (existing) return existing;
  const promise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync(
      "CREATE TABLE IF NOT EXISTS draft_store (draft_key TEXT PRIMARY KEY, payload TEXT NOT NULL, updated_at INTEGER NOT NULL);"
    );
    return db;
  })();
  dbCache.set(dbName, promise);
  return promise;
}

export function buildDraftStorageKey(tenantId: string, userId: string, draftKey: string): string {
  return `${tenantId}:${userId}:${draftKey}`;
}

export async function saveDraft<T>(
  tenantId: string,
  userId: string,
  draftKey: string,
  value: T,
  dbName?: string
): Promise<void> {
  const db = await getDraftDb(dbName);
  await db.runAsync(
    "INSERT OR REPLACE INTO draft_store (draft_key, payload, updated_at) VALUES (?, ?, ?)",
    [buildDraftStorageKey(tenantId, userId, draftKey), JSON.stringify(value), Date.now()]
  );
}

export async function loadDraft<T>(
  tenantId: string,
  userId: string,
  draftKey: string,
  dbName?: string
): Promise<T | null> {
  const db = await getDraftDb(dbName);
  const row = await db.getFirstAsync<{ payload: string }>(
    "SELECT payload FROM draft_store WHERE draft_key = ?",
    [buildDraftStorageKey(tenantId, userId, draftKey)]
  );
  if (!row) return null;
  try {
    return JSON.parse(row.payload) as T;
  } catch {
    return null;
  }
}

export async function clearDraft(
  tenantId: string,
  userId: string,
  draftKey: string,
  dbName?: string
): Promise<void> {
  const db = await getDraftDb(dbName);
  await db.runAsync("DELETE FROM draft_store WHERE draft_key = ?", [
    buildDraftStorageKey(tenantId, userId, draftKey),
  ]);
}

export async function clearAllDrafts(dbName?: string): Promise<void> {
  const db = await getDraftDb(dbName);
  await db.execAsync("DELETE FROM draft_store;");
}

export interface UseOfflineDraftAutoSaveOptions<T> {
  tenantId: string;
  userId: string;
  draftKey: string;
  value: T;
  enabled?: boolean;
  debounceMs?: number;
  dbName?: string;
}

export function useOfflineDraftAutoSave<T>({
  tenantId,
  userId,
  draftKey,
  value,
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  dbName,
}: UseOfflineDraftAutoSaveOptions<T>) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !tenantId || !userId || !draftKey) return;
    const timer = setTimeout(() => {
      if (mountedRef.current) setIsSaving(true);
      void saveDraft(tenantId, userId, draftKey, value, dbName)
        .then(() => {
          if (mountedRef.current) setLastSavedAt(Date.now());
        })
        .catch(() => {})
        .finally(() => {
          if (mountedRef.current) setIsSaving(false);
        });
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [tenantId, userId, draftKey, value, enabled, debounceMs, dbName]);

  const clear = useCallback(
    () => clearDraft(tenantId, userId, draftKey, dbName),
    [tenantId, userId, draftKey, dbName]
  );

  const load = useCallback(
    () => loadDraft<T>(tenantId, userId, draftKey, dbName),
    [tenantId, userId, draftKey, dbName]
  );

  return { isSaving, lastSavedAt, clearDraft: clear, loadDraft: load };
}
