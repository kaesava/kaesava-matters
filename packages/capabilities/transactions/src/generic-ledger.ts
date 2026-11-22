import { z } from "zod";
import { serializeCsvObjects } from "@kaesava/types";

export const LedgerDirectionSchema = z.enum(["DEBIT", "CREDIT"]);
export type LedgerDirection = z.infer<typeof LedgerDirectionSchema>;

export const RecordLedgerEntryInputSchema = z
  .object({
    entityType: z
      .string()
      .trim()
      .regex(/^[A-Z0-9_]+$/),
    entityId: z.string().uuid(),
    direction: LedgerDirectionSchema,
    amountCents: z.number().int().positive(),
    currency: z.string().length(3),
    occurredAt: z.string().min(1),
    description: z.string().trim().max(240).optional(),
    transferGroupId: z.string().uuid().optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .strict();

export type RecordLedgerEntryInput = z.infer<typeof RecordLedgerEntryInputSchema>;

export interface GenericLedgerEntry {
  id: string;
  tenantId: string;
  appId: string;
  entityType: string;
  entityId: string;
  direction: LedgerDirection;
  amountCents: number;
  currency: string;
  occurredAt: string;
  description: string | null;
  transferGroupId: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  archivedAt: Date | null;
}

export interface GenericLedgerStoreAdapter {
  insert: (
    tenantId: string,
    appId: string,
    userId: string,
    input: RecordLedgerEntryInput
  ) => Promise<GenericLedgerEntry>;
  list: (
    tenantId: string,
    appId: string,
    filter?: { entityType?: string; entityId?: string }
  ) => Promise<GenericLedgerEntry[]>;
}

export function createGenericLedgerCapability(store: GenericLedgerStoreAdapter) {
  return {
    recordEntry: async (
      tenantId: string,
      appId: string,
      userId: string,
      rawInput: RecordLedgerEntryInput
    ) => {
      const parsed = RecordLedgerEntryInputSchema.parse(rawInput);
      return store.insert(tenantId, appId, userId, parsed);
    },

    listEntries: (
      tenantId: string,
      appId: string,
      filter?: { entityType?: string; entityId?: string }
    ) => store.list(tenantId, appId, filter),

    computeNetBalanceCents: async (
      tenantId: string,
      appId: string,
      filter?: { entityType?: string; entityId?: string }
    ): Promise<number> => {
      const entries = await store.list(tenantId, appId, filter);
      return entries.reduce(
        (sum, e) => sum + (e.direction === "CREDIT" ? e.amountCents : -e.amountCents),
        0
      );
    },

    exportCsv: async (
      tenantId: string,
      appId: string,
      filter?: { entityType?: string; entityId?: string }
    ): Promise<string> => {
      const entries = await store.list(tenantId, appId, filter);
      return serializeCsvObjects(
        entries.map((e) => ({
          id: e.id,
          entityType: e.entityType,
          entityId: e.entityId,
          direction: e.direction,
          amount: (e.amountCents / 100).toFixed(2),
          currency: e.currency,
          occurredAt: e.occurredAt,
          description: e.description ?? "",
        })),
        [
          "id",
          "entityType",
          "entityId",
          "direction",
          "amount",
          "currency",
          "occurredAt",
          "description",
        ]
      );
    },
  };
}
