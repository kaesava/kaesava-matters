import type { DbOrTx } from "@kaesava/db/rings/tradie-matters";
import type { SyncFieldMutationsInputType } from "./schemas.js";
import { checkInVisitCommand, checkOutVisitCommand, type FieldActor } from "./timers.js";
import { attachJobPhotoCommand, logMaterialUsageCommand } from "./materials-photos.js";

export interface SyncMutationResult {
  clientMutationId: string;
  status: "APPLIED" | "FAILED";
  recordId: string | null;
  error?: string;
}

async function applySingleFieldMutation(
  db: DbOrTx,
  actor: FieldActor,
  item: SyncFieldMutationsInputType["mutations"][number]
): Promise<SyncMutationResult> {
  try {
    if (item.kind === "CHECK_IN") {
      const visit = await checkInVisitCommand(db, actor, {
        ...item.payload,
        clientMutationId: item.clientMutationId,
      });
      return { clientMutationId: item.clientMutationId, status: "APPLIED", recordId: visit.id };
    }
    if (item.kind === "CHECK_OUT") {
      const res = await checkOutVisitCommand(db, actor, {
        ...item.payload,
        clientMutationId: item.clientMutationId,
      });
      return {
        clientMutationId: item.clientMutationId,
        status: "APPLIED",
        recordId: res.timeEntry?.id ?? null,
      };
    }
    if (item.kind === "LOG_MATERIAL") {
      const mat = await logMaterialUsageCommand(db, actor, {
        ...item.payload,
        clientMutationId: item.clientMutationId,
      });
      return {
        clientMutationId: item.clientMutationId,
        status: "APPLIED",
        recordId: mat?.id ?? null,
      };
    }
    const photo = await attachJobPhotoCommand(db, actor, item.payload);
    return {
      clientMutationId: item.clientMutationId,
      status: "APPLIED",
      recordId: photo?.id ?? null,
    };
  } catch (err) {
    return {
      clientMutationId: item.clientMutationId,
      status: "FAILED",
      recordId: null,
      error: err instanceof Error ? err.message : "Unknown sync error",
    };
  }
}

export async function syncFieldMutationsCommand(
  db: DbOrTx,
  actor: FieldActor,
  input: SyncFieldMutationsInputType
) {
  const results: SyncMutationResult[] = [];
  for (const item of input.mutations) {
    results.push(await applySingleFieldMutation(db, actor, item));
  }
  return {
    appliedCount: results.filter((r) => r.status === "APPLIED").length,
    failedCount: results.filter((r) => r.status === "FAILED").length,
    results,
  };
}
