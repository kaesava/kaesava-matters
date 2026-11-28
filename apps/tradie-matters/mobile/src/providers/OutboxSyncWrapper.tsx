import React, { useCallback, useEffect } from "react";
import { OutboxSyncProvider, flushAttachmentQueue, useOutboxSync, type OutboxMutation, type QueuedAttachment } from "@kaesava/mobile-core";
import type {
  AttachJobPhotoInputType,
  CheckInVisitInputType,
  CheckOutVisitInputType,
  CreateQuoteInputType,
  CreateVariationInputType,
  LogMaterialUsageInputType,
  SyncFieldMutationsInputType,
  UpdateJobInputType,
} from "@tradie-matters/capability-operations";
import { authClient } from "../lib/auth";
import { API_BASE_URL, getActiveTenantId, getStoredTokenAndCookie, trpc } from "../lib/trpc";

export function OutboxSyncWrapper({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();
  const statusQuery = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session?.user,
    retry: false,
    staleTime: 60_000,
  });
  const utils = trpc.useUtils();
  const syncMut = trpc.field.syncMutations.useMutation({
    onSuccess: () => void utils.jobs.invalidate(),
  });
  const updateJobMut = trpc.jobs.update.useMutation({
    onSuccess: () => void utils.jobs.invalidate(),
  });
  const createQuoteMut = trpc.quotes.create.useMutation({
    onSuccess: () => void utils.quotes.invalidate(),
  });
  const addNoteMut = trpc.jobs.addNote.useMutation({
    onSuccess: () => void utils.jobs.invalidate(),
  });
  const presignMut = trpc.fileNotes.presignUpload.useMutation();
  const attachPhotoMut = trpc.field.attachJobPhoto.useMutation({
    onSuccess: () => void utils.jobs.invalidate(),
  });
  const createVariationMut = trpc.field.createVariation.useMutation({
    onSuccess: () => void utils.jobs.invalidate(),
  });

  const runSyncBatch = useCallback(
    async (mutations: SyncFieldMutationsInputType["mutations"]) => {
      const res = await syncMut.mutateAsync({ mutations });
      const failed = res.results?.filter((r) => !r.success) ?? [];
      if ((res.failedCount ?? 0) > 0 || failed.length > 0) {
        const msg = failed[0]?.error || "Offline sync failed";
        throw new Error(msg);
      }
    },
    [syncMut]
  );

  const executor = useCallback(
    async (mutation: OutboxMutation) => {
      const id = mutation.clientMutationId;
      if (mutation.procedure === "field.checkInVisit") {
        const payload = mutation.payload as CheckInVisitInputType;
        await runSyncBatch([{ kind: "CHECK_IN", clientMutationId: id, payload }]);
      } else if (mutation.procedure === "field.checkOutVisit") {
        const payload = mutation.payload as CheckOutVisitInputType;
        await runSyncBatch([{ kind: "CHECK_OUT", clientMutationId: id, payload }]);
      } else if (mutation.procedure === "field.logMaterialUsage") {
        const payload = mutation.payload as LogMaterialUsageInputType;
        await runSyncBatch([{ kind: "LOG_MATERIAL", clientMutationId: id, payload }]);
      } else if (mutation.procedure === "field.attachJobPhoto") {
        const payload = mutation.payload as AttachJobPhotoInputType;
        await runSyncBatch([{ kind: "ATTACH_PHOTO", clientMutationId: id, payload }]);
      } else if (mutation.procedure === "field.createVariation") {
        const payload = mutation.payload as CreateVariationInputType;
        await createVariationMut.mutateAsync(payload);
      } else if (mutation.procedure === "jobs.update") {
        await updateJobMut.mutateAsync(mutation.payload as UpdateJobInputType);
      } else if (mutation.procedure === "quotes.create") {
        await createQuoteMut.mutateAsync(mutation.payload as CreateQuoteInputType);
      } else if (mutation.procedure === "jobs.addNote") {
        await addNoteMut.mutateAsync(
          mutation.payload as { jobId: string; body: string; isInternalOnly?: boolean }
        );
      }
    },
    [runSyncBatch, createVariationMut, updateJobMut, createQuoteMut, addNoteMut]
  );

  const tenantId = statusQuery.data?.tenantId ?? getActiveTenantId();
  const userId = session?.user?.id ?? null;

  const uploadAttachment = useCallback(
    async (att: {
      entityId: string;
      localUri: string;
      fileName: string;
      mimeType: string;
      fileSize?: number;
      photoCategory?: string;
      visibility?: string;
      caption?: string;
      visitId?: string;
    }) => {
      const presigned = await presignMut.mutateAsync({
        entityType: "JOB",
        entityId: att.entityId,
        fileName: att.fileName,
        fileMimeType: att.mimeType,
        fileSize: att.fileSize ?? 0,
      });
      const uploadUrl = presigned.uploadUrl.startsWith("/")
        ? `${API_BASE_URL}${presigned.uploadUrl}`
        : presigned.uploadUrl;
      const { token, cookie } = await getStoredTokenAndCookie();
      const headers: Record<string, string> = { "Content-Type": att.mimeType };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (cookie) headers["Cookie"] = cookie;
      if (tenantId) headers["x-tenant-id"] = tenantId;

      const blob = await (await fetch(att.localUri)).blob();
      const res = await fetch(uploadUrl, { method: "PUT", headers, body: blob });
      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }
      await attachPhotoMut.mutateAsync({
        jobId: att.entityId,
        visitId: att.visitId,
        fileNoteId: presigned.fileKey,
        photoCategory: (att.photoCategory as AttachJobPhotoInputType["photoCategory"]) ?? "DURING",
        visibility: (att.visibility as AttachJobPhotoInputType["visibility"]) ?? "INTERNAL",
        caption: att.caption,
      });
    },
    [presignMut, attachPhotoMut, tenantId]
  );

  return (
    <OutboxSyncProvider
      tenantId={tenantId}
      userId={userId}
      executor={executor}
    >
      <AttachmentFlusher tenantId={tenantId} userId={userId} uploader={uploadAttachment} />
      {children}
    </OutboxSyncProvider>
  );
}

function AttachmentFlusher({
  tenantId,
  userId,
  uploader,
}: {
  tenantId: string | null;
  userId: string | null;
  uploader: (att: QueuedAttachment) => Promise<void>;
}) {
  const { isOnline } = useOutboxSync();
  useEffect(() => {
    if (isOnline && tenantId && userId) {
      void flushAttachmentQueue({ tenantId, userId, uploader });
    }
  }, [isOnline, tenantId, userId, uploader]);
  return null;
}
