import * as SQLite from "expo-sqlite";

const DEFAULT_DB_NAME = "kaesava_offline.db";
const dbCache = new Map<string, Promise<SQLite.SQLiteDatabase>>();

export type AttachmentQueueStatus = "pending" | "uploading" | "uploaded" | "failed";

export interface QueuedAttachment {
  id: string;
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  localUri: string;
  mimeType: string;
  fileName: string;
  status: AttachmentQueueStatus;
  attempts: number;
  createdAt: number;
  lastError: string | null;
}

interface AttachmentRow {
  id: string;
  tenant_id: string;
  user_id: string;
  entity_type: string;
  entity_id: string;
  local_uri: string;
  mime_type: string;
  file_name: string;
  status: AttachmentQueueStatus;
  attempts: number;
  created_at: number;
  last_error: string | null;
}

async function getAttachmentDb(dbName: string = DEFAULT_DB_NAME): Promise<SQLite.SQLiteDatabase> {
  const existing = dbCache.get(dbName);
  if (existing) return existing;
  const promise = (async () => {
    const db = await SQLite.openDatabaseAsync(dbName);
    await db.execAsync(
      `CREATE TABLE IF NOT EXISTS attachment_queue (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        local_uri TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_name TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        last_error TEXT
      );`
    );
    return db;
  })();
  dbCache.set(dbName, promise);
  return promise;
}

function mapAttachmentRow(row: AttachmentRow): QueuedAttachment {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    userId: row.user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    localUri: row.local_uri,
    mimeType: row.mime_type,
    fileName: row.file_name,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.created_at,
    lastError: row.last_error,
  };
}

function generateAttachmentId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function enqueueAttachment(params: {
  tenantId: string;
  userId: string;
  entityType: string;
  entityId: string;
  localUri: string;
  mimeType: string;
  fileName: string;
  id?: string;
  dbName?: string;
}): Promise<string> {
  const db = await getAttachmentDb(params.dbName);
  const id = params.id ?? generateAttachmentId();
  await db.runAsync(
    `INSERT OR REPLACE INTO attachment_queue
      (id, tenant_id, user_id, entity_type, entity_id, local_uri, mime_type, file_name, status, attempts, created_at, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NULL)`,
    [
      id,
      params.tenantId,
      params.userId,
      params.entityType,
      params.entityId,
      params.localUri,
      params.mimeType,
      params.fileName,
      Date.now(),
    ]
  );
  return id;
}

export async function getPendingAttachments(
  tenantId: string,
  userId: string,
  dbName?: string
): Promise<QueuedAttachment[]> {
  const db = await getAttachmentDb(dbName);
  const rows = await db.getAllAsync<AttachmentRow>(
    `SELECT * FROM attachment_queue
     WHERE tenant_id = ? AND user_id = ? AND status IN ('pending', 'failed')
     ORDER BY created_at ASC`,
    [tenantId, userId]
  );
  return rows.map(mapAttachmentRow);
}

export async function markAttachmentUploaded(id: string, dbName?: string): Promise<void> {
  const db = await getAttachmentDb(dbName);
  await db.runAsync("DELETE FROM attachment_queue WHERE id = ?", [id]);
}

export async function markAttachmentFailed(
  id: string,
  errorMessage: string,
  dbName?: string
): Promise<void> {
  const db = await getAttachmentDb(dbName);
  await db.runAsync(
    "UPDATE attachment_queue SET status = 'failed', attempts = attempts + 1, last_error = ? WHERE id = ?",
    [errorMessage, id]
  );
}

export async function flushAttachmentQueue(params: {
  tenantId: string;
  userId: string;
  uploader: (attachment: QueuedAttachment) => Promise<void>;
  dbName?: string;
}): Promise<{ uploaded: number; failed: number }> {
  const pending = await getPendingAttachments(params.tenantId, params.userId, params.dbName);
  let uploaded = 0;
  let failed = 0;
  for (const item of pending) {
    try {
      await params.uploader(item);
      await markAttachmentUploaded(item.id, params.dbName);
      uploaded += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await markAttachmentFailed(item.id, msg, params.dbName);
      failed += 1;
    }
  }
  return { uploaded, failed };
}
