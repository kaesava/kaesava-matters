import React, { useCallback } from "react";
import { OutboxSyncProvider, type OutboxMutation } from "@kaesava/mobile-core";
import type {
  AttachJobPhotoInputType,
  CheckInVisitInputType,
  CheckOutVisitInputType,
  LogMaterialUsageInputType,
  UpdateJobInputType,
} from "@tradie-matters/capability-operations";
import { authClient } from "../lib/auth";
import { getActiveTenantId, trpc } from "../lib/trpc";

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

  const executor = useCallback(
    async (mutation: OutboxMutation) => {
      const id = mutation.clientMutationId;
      if (mutation.procedure === "field.checkInVisit") {
        const payload = mutation.payload as CheckInVisitInputType;
        await syncMut.mutateAsync({ mutations: [{ kind: "CHECK_IN", clientMutationId: id, payload }] });
      } else if (mutation.procedure === "field.checkOutVisit") {
        const payload = mutation.payload as CheckOutVisitInputType;
        await syncMut.mutateAsync({ mutations: [{ kind: "CHECK_OUT", clientMutationId: id, payload }] });
      } else if (mutation.procedure === "field.logMaterialUsage") {
        const payload = mutation.payload as LogMaterialUsageInputType;
        await syncMut.mutateAsync({ mutations: [{ kind: "LOG_MATERIAL", clientMutationId: id, payload }] });
      } else if (mutation.procedure === "field.attachJobPhoto") {
        const payload = mutation.payload as AttachJobPhotoInputType;
        await syncMut.mutateAsync({ mutations: [{ kind: "ATTACH_PHOTO", clientMutationId: id, payload }] });
      } else if (mutation.procedure === "jobs.update") {
        await updateJobMut.mutateAsync(mutation.payload as UpdateJobInputType);
      }
    },
    [syncMut, updateJobMut]
  );

  const tenantId = statusQuery.data?.tenantId ?? getActiveTenantId();
  const userId = session?.user?.id ?? null;

  return (
    <OutboxSyncProvider tenantId={tenantId} userId={userId} executor={executor}>
      {children}
    </OutboxSyncProvider>
  );
}
