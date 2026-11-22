import { CapabilityError, getPresignedUploadUrl, getPresignedDownloadUrl } from "@money-matters/core";
import { eq, and, or, isNull, isNotNull, desc, sql } from "drizzle-orm";
import { fileNotes, users, apps, type DbOrTx } from "@money-matters/db/rings/capabilities";
import { resolveEffectiveAppFlags } from "@money-matters/config";
import {
  CreatePreSignedUrlInput,
  CreateFileNoteInput,
  UpdateFileNoteCommentInput,
  FileNotesListInput,
  FileNoteDto,
  StorageQuotaDto,
  DEFAULT_APP_FEATURE_FLAGS,
  type AppFeatureFlags,
  type EntityPrivacyResolverMap,
  type EntityPrivacyResolution,
} from "@money-matters/types";

function privacyFilter(userId: string) {
  return or(eq(fileNotes.isPrivate, false), eq(fileNotes.userId, userId));
}

export interface FileNotesContext {
  tenantId: string;
  userId: string;
  appId: string;
  allowedEntityTypes?: readonly string[];
  entityResolvers?: EntityPrivacyResolverMap<DbOrTx>;
}

async function getAppFlags(db: DbOrTx, appId: string): Promise<AppFeatureFlags> {
  const [appRecord] = await db
    .select({ featureFlags: apps.featureFlags })
    .from(apps)
    .where(eq(apps.id, appId))
    .limit(1);

  return {
    ...DEFAULT_APP_FEATURE_FLAGS,
    ...resolveEffectiveAppFlags(appId, appRecord?.featureFlags as unknown as Record<string, unknown> | undefined),
  } as AppFeatureFlags;
}

async function resolveEntityPrivacy(
  db: DbOrTx,
  ctx: FileNotesContext,
  entityType: string,
  entityId: string
): Promise<EntityPrivacyResolution> {
  if (ctx.allowedEntityTypes && !ctx.allowedEntityTypes.includes(entityType)) {
    return { exists: false, isPrivate: true, ownerUserId: null };
  }
  const resolver = ctx.entityResolvers?.[entityType];
  if (!resolver) {
    if (ctx.allowedEntityTypes) {
      return { exists: false, isPrivate: true, ownerUserId: null };
    }
    return { exists: true, isPrivate: false, ownerUserId: null };
  }
  return resolver(db, { tenantId: ctx.tenantId, userId: ctx.userId, appId: ctx.appId }, entityId);
}

export async function createPreSignedUrlHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: CreatePreSignedUrlInput
): Promise<{ fileKey: string; uploadUrl: string }> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    throw new CapabilityError("FORBIDDEN", "file_notes_disabled");
  }

  const maxFileBytes = flags.fileNotesMaxFileMb * 1024 * 1024;
  if (input.fileSize > maxFileBytes) {
    throw new CapabilityError(
      "BAD_REQUEST",
      `File size exceeds the limit of ${flags.fileNotesMaxFileMb}MB`
    );
  }

  // Quota enforcement: compute tenant storage scoped to appId
  const [usage] = await db
    .select({
      totalBytes: sql<string>`COALESCE(SUM(CAST(${fileNotes.fileSize} AS BIGINT)), 0)`,
    })
    .from(fileNotes)
    .where(
      and(
        eq(fileNotes.tenantId, ctx.tenantId),
        eq(fileNotes.appId, ctx.appId),
        isNotNull(fileNotes.fileKey)
      )
    );

  const currentBytes = Number(usage?.totalBytes || 0);
  const maxStorageBytes = flags.fileNotesMaxStorageMb * 1024 * 1024;
  if (currentBytes + input.fileSize > maxStorageBytes) {
    throw new CapabilityError("BAD_REQUEST", "storage_quota_exceeded");
  }

  // Verify entity access
  const entityInfo = await resolveEntityPrivacy(db, ctx, input.entityType, input.entityId);
  if (!entityInfo.exists) {
    throw new CapabilityError("NOT_FOUND", "target_entity_not_found");
  }
  if (entityInfo.isPrivate && entityInfo.ownerUserId && entityInfo.ownerUserId !== ctx.userId) {
    throw new CapabilityError("FORBIDDEN", "private_entity_unauthorized");
  }

  const sanitizedFileName = input.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueId = crypto.randomUUID();
  const fileKey = `apps/${ctx.appId}/tenants/${ctx.tenantId}/${input.entityType.toLowerCase()}/${input.entityId}/${uniqueId}-${sanitizedFileName}`;

  const uploadUrl = await getPresignedUploadUrl(fileKey, input.fileMimeType);
  return { fileKey, uploadUrl };
}

export async function createFileNoteHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: CreateFileNoteInput
): Promise<FileNoteDto> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    throw new CapabilityError("FORBIDDEN", "file_notes_disabled");
  }

  const entityInfo = await resolveEntityPrivacy(db, ctx, input.entityType, input.entityId);
  if (!entityInfo.exists) {
    throw new CapabilityError("NOT_FOUND", "target_entity_not_found");
  }
  if (entityInfo.isPrivate && entityInfo.ownerUserId && entityInfo.ownerUserId !== ctx.userId) {
    throw new CapabilityError("FORBIDDEN", "private_entity_unauthorized");
  }

  const isPrivate = entityInfo.isPrivate;
  const noteUserId = isPrivate ? ctx.userId : null;
  const now = new Date();

  const [created] = await db
    .insert(fileNotes)
    .values({
      id: crypto.randomUUID(),
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      entityType: input.entityType,
      entityId: input.entityId,
      comment: input.comment || null,
      fileKey: input.attachment?.fileKey || null,
      fileName: input.attachment?.fileName || null,
      fileMimeType: input.attachment?.fileMimeType || null,
      fileSize: input.attachment?.fileSize ? String(input.attachment.fileSize) : null,
      isPrivate,
      userId: noteUserId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  return {
    id: created.id,
    tenantId: created.tenantId,
    appId: created.appId,
    entityType: created.entityType as "ENVELOPE" | "BANK_ACCOUNT",
    entityId: created.entityId,
    comment: created.comment,
    fileKey: created.fileKey,
    fileName: created.fileName,
    fileMimeType: created.fileMimeType,
    fileSize: created.fileSize,
    isPrivate: created.isPrivate,
    userId: created.userId,
    createdAt: created.createdAt,
    createdBy: created.createdBy,
    updatedAt: created.updatedAt,
    updatedBy: created.updatedBy,
    archivedAt: created.archivedAt,
  };
}

export async function listFileNotesHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: FileNotesListInput
): Promise<FileNoteDto[]> {
  const flags = await getAppFlags(db, ctx.appId);
  if (!flags.fileNotes) {
    return [];
  }

  const entityInfo = await resolveEntityPrivacy(db, ctx, input.entityType, input.entityId);
  if (!entityInfo.exists) {
    return [];
  }
  if (entityInfo.isPrivate && entityInfo.ownerUserId && entityInfo.ownerUserId !== ctx.userId) {
    throw new CapabilityError("FORBIDDEN", "private_entity_unauthorized");
  }

  const conditions = [
    eq(fileNotes.tenantId, ctx.tenantId),
    eq(fileNotes.appId, ctx.appId),
    eq(fileNotes.entityType, input.entityType),
    eq(fileNotes.entityId, input.entityId),
    privacyFilter(ctx.userId),
  ];

  if (input.status === "ACTIVE") {
    conditions.push(isNull(fileNotes.archivedAt));
  } else if (input.status === "ARCHIVED") {
    conditions.push(isNotNull(fileNotes.archivedAt));
  }

  const rows = await db
    .select({
      note: fileNotes,
      creatorName: users.displayName,
      creatorEmail: users.email,
    })
    .from(fileNotes)
    .leftJoin(users, eq(fileNotes.createdBy, users.id))
    .where(and(...conditions))
    .orderBy(desc(fileNotes.createdAt));

  return rows.map(({ note, creatorName, creatorEmail }) => ({
    id: note.id,
    tenantId: note.tenantId,
    appId: note.appId,
    entityType: note.entityType as "ENVELOPE" | "BANK_ACCOUNT",
    entityId: note.entityId,
    comment: note.comment,
    fileKey: note.fileKey,
    fileName: note.fileName,
    fileMimeType: note.fileMimeType,
    fileSize: note.fileSize,
    isPrivate: note.isPrivate,
    userId: note.userId,
    createdAt: note.createdAt,
    createdBy: note.createdBy,
    updatedAt: note.updatedAt,
    updatedBy: note.updatedBy,
    archivedAt: note.archivedAt,
    creatorName: creatorName || creatorEmail || "Household Member",
  }));
}

export async function getDownloadUrlHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  id: string
): Promise<{ downloadUrl: string }> {
  const [note] = await db
    .select()
    .from(fileNotes)
    .where(and(eq(fileNotes.id, id), eq(fileNotes.tenantId, ctx.tenantId), eq(fileNotes.appId, ctx.appId), privacyFilter(ctx.userId)))
    .limit(1);

  if (!note || !note.fileKey) {
    throw new CapabilityError("NOT_FOUND", "attachmentNotFound");
  }

  const downloadUrl = await getPresignedDownloadUrl(note.id);
  return { downloadUrl };
}

export async function updateFileNoteCommentHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  input: UpdateFileNoteCommentInput
): Promise<FileNoteDto> {
  const [existing] = await db
    .select()
    .from(fileNotes)
    .where(
      and(
        eq(fileNotes.id, input.id),
        eq(fileNotes.tenantId, ctx.tenantId),
        eq(fileNotes.appId, ctx.appId),
        privacyFilter(ctx.userId),
        isNull(fileNotes.archivedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new CapabilityError("NOT_FOUND", "fileNoteNotFound");
  }

  const [updated] = await db
    .update(fileNotes)
    .set({
      comment: input.comment,
      updatedAt: new Date(),
      updatedBy: ctx.userId,
    })
    .where(and(eq(fileNotes.id, input.id), eq(fileNotes.tenantId, ctx.tenantId), eq(fileNotes.appId, ctx.appId)))
    .returning();

  return {
    id: updated.id,
    tenantId: updated.tenantId,
    appId: updated.appId,
    entityType: updated.entityType,
    entityId: updated.entityId,
    comment: updated.comment,
    fileKey: updated.fileKey,
    fileName: updated.fileName,
    fileMimeType: updated.fileMimeType,
    fileSize: updated.fileSize,
    isPrivate: updated.isPrivate,
    userId: updated.userId,
    createdAt: updated.createdAt,
    createdBy: updated.createdBy,
    updatedAt: updated.updatedAt,
    updatedBy: updated.updatedBy,
    archivedAt: updated.archivedAt,
  };
}

export async function archiveFileNoteHandler(
  db: DbOrTx,
  ctx: FileNotesContext,
  id: string
): Promise<{ success: boolean }> {
  const [existing] = await db
    .select()
    .from(fileNotes)
    .where(
      and(
        eq(fileNotes.id, id),
        eq(fileNotes.tenantId, ctx.tenantId),
        eq(fileNotes.appId, ctx.appId),
        privacyFilter(ctx.userId),
        isNull(fileNotes.archivedAt)
      )
    )
    .limit(1);

  if (!existing) {
    throw new CapabilityError("NOT_FOUND", "fileNoteNotFound");
  }

  await db
    .update(fileNotes)
    .set({
      archivedAt: new Date(),
      archivedBy: ctx.userId,
    })
    .where(and(eq(fileNotes.id, id), eq(fileNotes.tenantId, ctx.tenantId), eq(fileNotes.appId, ctx.appId)));

  return { success: true };
}

export async function getStorageQuotaHandler(
  db: DbOrTx,
  ctx: FileNotesContext
): Promise<StorageQuotaDto> {
  const flags = await getAppFlags(db, ctx.appId);

  const [usage] = await db
    .select({
      totalBytes: sql<string>`COALESCE(SUM(CAST(${fileNotes.fileSize} AS BIGINT)), 0)`,
    })
    .from(fileNotes)
    .where(and(eq(fileNotes.tenantId, ctx.tenantId), eq(fileNotes.appId, ctx.appId), isNotNull(fileNotes.fileKey)));

  return {
    usedBytes: Number(usage?.totalBytes || 0),
    maxBytes: flags.fileNotesMaxStorageMb * 1024 * 1024,
    maxFileBytes: flags.fileNotesMaxFileMb * 1024 * 1024,
  };
}
