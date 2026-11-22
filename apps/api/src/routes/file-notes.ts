import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import { createEdgeContext, EdgeContextEnv } from '../trpc/edge-context.js';
import { uploadObjectToStorage, downloadObjectFromStorage } from '@money-matters/core';
import { fileNotes } from '@money-matters/db';
import { and, eq, or, sql } from 'drizzle-orm';

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB safety ceiling
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

function normalizeContentType(raw: string | null): string {
  return (raw || '').split(';')[0].trim().toLowerCase();
}

export async function handleFileNotesRequest(
  request: Request,
  url: URL,
  env: EdgeContextEnv,
  correlationId: string,
  baseHeaders: Record<string, string>
): Promise<Response> {
  const resHeaders = new Headers(baseHeaders);
  resHeaders.set('x-correlation-id', correlationId);

  const ctx = await createEdgeContext(
    { req: request, resHeaders, info: {} as unknown as FetchCreateContextFnOptions['info'] },
    env
  );
  if (!ctx.userId || !ctx.tenantId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  if (url.pathname === '/api/file-notes/upload' && request.method === 'PUT') {
    const fileKey = url.searchParams.get('key') || '';
    const appScopedPrefix = `apps/${ctx.appId}/tenants/${ctx.tenantId}/`;
    const legacyPrefix = `tenants/${ctx.tenantId}/`;
    if (!fileKey || (!fileKey.startsWith(appScopedPrefix) && !fileKey.startsWith(legacyPrefix))) {
      return new Response(JSON.stringify({ error: 'Forbidden file key' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const buffer = await request.arrayBuffer();
    if (buffer.byteLength > MAX_UPLOAD_BYTES) {
      return new Response(JSON.stringify({ error: 'File exceeds maximum upload size' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const contentType = normalizeContentType(request.headers.get('content-type'));
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(contentType)) {
      return new Response(JSON.stringify({ error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, HEIC, PDF.' }), {
        status: 415,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }
    await uploadObjectToStorage(fileKey, new Uint8Array(buffer), contentType);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...baseHeaders },
    });
  }

  if (url.pathname.startsWith('/api/file-notes/download/') && request.method === 'GET') {
    const noteId = decodeURIComponent(url.pathname.slice('/api/file-notes/download/'.length));
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Missing note ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const [note] = await ctx.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${ctx.tenantId!}, true)`);
      await tx.execute(sql`SELECT set_config('app.current_user_id', ${ctx.userId!}, true)`);
      return tx
        .select()
        .from(fileNotes)
        .where(
          and(
            eq(fileNotes.id, noteId),
            eq(fileNotes.tenantId, ctx.tenantId!),
            ...(ctx.appId ? [eq(fileNotes.appId, ctx.appId)] : []),
            or(eq(fileNotes.isPrivate, false), eq(fileNotes.userId, ctx.userId!))
          )
        )
        .limit(1);
    });

    if (!note || !note.fileKey) {
      return new Response(JSON.stringify({ error: 'Attachment not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const stored = await downloadObjectFromStorage(note.fileKey);
    if (!stored) {
      return new Response(JSON.stringify({ error: 'File object not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...baseHeaders },
      });
    }

    const safeFileName = (note.fileName || 'attachment').replace(/["\r\n]/g, '_');
    const resolvedType = normalizeContentType(note.fileMimeType || stored.contentType);
    const isSafeInlineImage = resolvedType.startsWith('image/') && ALLOWED_UPLOAD_MIME_TYPES.has(resolvedType);
    const disposition = isSafeInlineImage ? 'inline' : 'attachment';

    return new Response(stored.body as unknown as BodyInit, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': ALLOWED_UPLOAD_MIME_TYPES.has(resolvedType) ? resolvedType : 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename="${safeFileName}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, max-age=300',
      },
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...baseHeaders },
  });
}
