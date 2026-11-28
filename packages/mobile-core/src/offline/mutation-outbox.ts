import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as Network from "expo-network";
import * as SQLite from "expo-sqlite";

const DEFAULT_DB_NAME = "kaesava_offline.db";
const dbCache = new Map<string, Promise<SQLite.SQLiteDatabase>>();

export interface OutboxMutation<TPayload = unknown> {
  clientMutationId: string;
  tenantId: string;
  userId: string;
  procedure: string;
  payload: TPayload;
  attempts: number;
  nextAttemptAt: number;
  createdAt: number;
  lastError: string | null;
}

interface OutboxRow {
  id: string;
  tenant_id: string;
  user_id: string;
  procedure: string;
  payload: string;
  attempts: number;
  next_attempt_at: number;
  created_at: number;
  last_error: string | null;
}

async function getOutboxDb(dbName: string = DEFAULT_DB_NAME): Promise<SQLite.SQLiteDatabase> {
  const existing = dbCache.get(dbName);
  if (existing) return existing;
  const promise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS mutation_outbox (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        procedure TEXT NOT NULL,
        payload TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        next_attempt_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        last_error TEXT
      );`
    );
    return db;
  })();
  dbCache.set(dbName, promise);
  return promise;
}

function generateClientMutationId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `mut_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function mapOutboxRow(row: OutboxRow): OutboxMutation {
  return {
    clientMutationId: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    procedure: row.procedure,
    payload: JSON.parse(row.payload) as unknown,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    createdAt: row.created_at,
    lastError: row.last_error,
  };
}

export async function enqueueMutation<TPayload>(params: {
  tenantId: string;
  userId: string;
  procedure: string;
  payload: TPayload;
  clientMutationId?: string;
  dbName?: string;
}): Promise<string> {
  const db = await getOutboxDb(params.dbName);
  const id = params.clientMutationId ?? generateClientMutationId();
  const now = Date.now();
  await db.runAsync(
    `INSERT OR REPLACE INTO mutation_outbox
      (id, tenant_id, user_id, procedure, payload, attempts, next_attempt_at, created_at, last_error)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, NULL)`,
    [id, params.tenantId, params.userId, params.procedure, JSON.stringify(params.payload), now, now]
  );
  return id;
}

export async function getPendingMutations(
  tenantId: string,
  userId: string,
  dbName?: string
): Promise<OutboxMutation[]> {
  const db = await getOutboxDb(dbName);
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM mutation_outbox
     WHERE tenant_id = ? AND user_id = ? AND next_attempt_at <= ?
     ORDER BY created_at ASC`,
    [tenantId, userId, Date.now()]
  );
  return rows.map(mapOutboxRow);
}

export async function getOutboxCount(
  tenantId: string,
  userId: string,
  dbName?: string
): Promise<number> {
  const db = await getOutboxDb(dbName);
  const row = await db.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM mutation_outbox WHERE tenant_id = ? AND user_id = ?",
    [tenantId, userId]
  );
  return row?.count ?? 0;
}

export async function markMutationCompleted(clientMutationId: string, dbName?: string): Promise<void> {
  const db = await getOutboxDb(dbName);
  await db.runAsync("DELETE FROM mutation_outbox WHERE id = ?", [clientMutationId]);
}

export async function markMutationFailed(
  clientMutationId: string,
  errorMessage: string,
  baseBackoffMs: number = 1000,
  maxBackoffMs: number = 60_000,
  dbName?: string
): Promise<void> {
  const db = await getOutboxDb(dbName);
  const row = await db.getFirstAsync<{ attempts: number }>(
    "SELECT attempts FROM mutation_outbox WHERE id = ?",
    [clientMutationId]
  );
  const nextAttempts = (row?.attempts ?? 0) + 1;
  const delayMs = Math.min(maxBackoffMs, baseBackoffMs * 2 ** (nextAttempts - 1));
  await db.runAsync(
    "UPDATE mutation_outbox SET attempts = ?, next_attempt_at = ?, last_error = ? WHERE id = ?",
    [nextAttempts, Date.now() + delayMs, errorMessage, clientMutationId]
  );
}

export async function flushOutbox(params: {
  tenantId: string;
  userId: string;
  executor: (mutation: OutboxMutation) => Promise<void>;
  dbName?: string;
}): Promise<{ processed: number; failed: number }> {
  const pending = await getPendingMutations(params.tenantId, params.userId, params.dbName);
  let processed = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await params.executor(item);
      await markMutationCompleted(item.clientMutationId, params.dbName);
      processed += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markMutationFailed(item.clientMutationId, msg, 1000, 60_000, params.dbName);
      failed += 1;
      break;
    }
  }
  return { processed, failed };
}

export interface OutboxSyncContextValue {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncNow: () => Promise<void>;
}

const OutboxSyncContext = createContext<OutboxSyncContextValue>({
  isOnline: true,
  isSyncing: false,
  pendingCount: 0,
  syncNow: async () => {},
});

export interface OutboxSyncProviderProps {
  tenantId: string | null;
  userId: string | null;
  executor: (mutation: OutboxMutation) => Promise<void>;
  dbName?: string;
  children: React.ReactNode;
}

export function OutboxSyncProvider({
  tenantId,
  userId,
  executor,
  dbName,
  children,
}: OutboxSyncProviderProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (!tenantId || !userId) {
      setPendingCount(0);
      return;
    }
    setPendingCount(await getOutboxCount(tenantId, userId, dbName));
  }, [tenantId, userId, dbName]);

  const syncNow = useCallback(async () => {
    if (!tenantId || !userId || !isOnline || syncingRef.current) return;
    syncingRef.current = true;
    setIsSyncing(true);
    try {
      await flushOutbox({ tenantId, userId, executor, dbName });
      await refreshCount();
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [tenantId, userId, isOnline, executor, dbName, refreshCount]);

  useEffect(() => {
    void Network.getNetworkStateAsync().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    const sub = Network.addNetworkStateListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    void refreshCount();
    if (isOnline) void syncNow();
  }, [isOnline, refreshCount, syncNow]);

  return React.createElement(
    OutboxSyncContext.Provider,
    { value: { isOnline, isSyncing, pendingCount, syncNow } },
    children
  );
}

export function useOutboxSync(): OutboxSyncContextValue {
  return useContext(OutboxSyncContext);
}
