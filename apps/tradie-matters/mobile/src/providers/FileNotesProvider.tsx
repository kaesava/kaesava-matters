import React, { useMemo } from "react";
import { FileNotesServiceProvider, type FileNotesService } from "@kaesava/capability-file-notes/mobile";
import { API_BASE_URL, getActiveTenantId, getStoredTokenAndCookie, trpc } from "../lib/trpc";

function resolveMobileFileUrl(rawUrl: string): string {
  if (rawUrl.startsWith("/")) {
    return `${API_BASE_URL.replace(/\/$/, "")}${rawUrl}`;
  }
  return rawUrl;
}

export function MobileFileNotesProvider({ children }: { children: React.ReactNode }) {
  const trpcUtils = trpc.useUtils();

  const service: FileNotesService = useMemo(
    () => ({
      useListQuery: (input: { entityType: "ENVELOPE" | "BANK_ACCOUNT"; entityId: string }) => {
        const query = trpc.fileNotes.list.useQuery(input, { enabled: Boolean(input.entityId) });
        return { data: query.data, isFetching: query.isFetching, refetch: query.refetch };
      },
      getDownloadUrl: async (id: string) => {
        const res = await trpcUtils.fileNotes.getDownloadUrl.fetch({ id });
        return { downloadUrl: resolveMobileFileUrl(res.downloadUrl) };
      },
      getAuthHeaders: async () => {
        const { token, cookie } = await getStoredTokenAndCookie();
        const tenantId = getActiveTenantId();
        const headers: Record<string, string> = {};
        if (cookie) headers["Cookie"] = cookie;
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (tenantId) headers["x-tenant-id"] = tenantId;
        return headers;
      },
      useCreatePreSignedUrlMutation: () => {
        const mut = trpc.fileNotes.createPreSignedUrl.useMutation();
        return {
          mutateAsync: async (input) => {
            const res = await mut.mutateAsync(input);
            return { fileKey: res.fileKey, uploadUrl: resolveMobileFileUrl(res.uploadUrl) };
          },
          isPending: mut.isPending,
        };
      },
      useCreateMutation: () => {
        const mut = trpc.fileNotes.create.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
            trpcUtils.fileNotes.getStorageQuota.invalidate();
          },
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      useUpdateCommentMutation: () => {
        const mut = trpc.fileNotes.updateComment.useMutation({
          onSuccess: () => trpcUtils.fileNotes.list.invalidate(),
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      useArchiveMutation: () => {
        const mut = trpc.fileNotes.archive.useMutation({
          onSuccess: () => trpcUtils.fileNotes.list.invalidate(),
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      usePurgeMutation: () => {
        const mut = trpc.fileNotes.archive.useMutation({
          onSuccess: () => {
            trpcUtils.fileNotes.list.invalidate();
            trpcUtils.fileNotes.getStorageQuota.invalidate();
          },
        });
        return {
          mutateAsync: async (input: { id: string }) => {
            const res = await mut.mutateAsync(input);
            return { success: res.success, purgedId: input.id };
          },
          isPending: mut.isPending,
        };
      },
    }),
    [trpcUtils]
  );

  return <FileNotesServiceProvider service={service}>{children}</FileNotesServiceProvider>;
}
