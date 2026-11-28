"use client";

import React, { useMemo } from "react";
import { FileNotesServiceProvider, type FileNotesService } from "@kaesava/capability-file-notes";
import { trpc } from "../lib/trpc";

export function WebFileNotesProvider({ children }: { children: React.ReactNode }) {
  const trpcUtils = trpc.useUtils();

  const service: FileNotesService = useMemo(
    () => ({
      useListQuery: (input: { entityType: "ENVELOPE" | "BANK_ACCOUNT"; entityId: string }) => {
        const query = trpc.fileNotes.list.useQuery(input, { enabled: Boolean(input.entityId) });
        return { data: query.data, isFetching: query.isFetching, refetch: query.refetch };
      },
      getDownloadUrl: async (id: string) => trpcUtils.fileNotes.getDownloadUrl.fetch({ id }),
      useCreatePreSignedUrlMutation: () => {
        const mut = trpc.fileNotes.createPreSignedUrl.useMutation();
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      useCreateMutation: () => {
        const mut = trpc.fileNotes.create.useMutation({
          onSuccess: () => {
            void trpcUtils.fileNotes.list.invalidate();
            void trpcUtils.fileNotes.getStorageQuota.invalidate();
          },
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      useUpdateCommentMutation: () => {
        const mut = trpc.fileNotes.updateComment.useMutation({
          onSuccess: () => void trpcUtils.fileNotes.list.invalidate(),
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      useArchiveMutation: () => {
        const mut = trpc.fileNotes.archive.useMutation({
          onSuccess: () => void trpcUtils.fileNotes.list.invalidate(),
        });
        return { mutateAsync: mut.mutateAsync, isPending: mut.isPending };
      },
      usePurgeMutation: () => {
        const mut = trpc.fileNotes.archive.useMutation({
          onSuccess: () => {
            void trpcUtils.fileNotes.list.invalidate();
            void trpcUtils.fileNotes.getStorageQuota.invalidate();
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
