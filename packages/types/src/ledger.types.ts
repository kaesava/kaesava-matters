import { z } from "zod";

/**
 * Query schema for listing transaction ledger entries with pagination.
 */
export const ListTransactionsQuery = z.object({
  limit: z.number().int().min(1).max(1000).default(50),
  offset: z.number().int().default(0),
  envelopeId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();

/**
 * Query schema for global search across historical transaction ledger entries.
 */
export const SearchTransactionsQuery = z.object({
  query: z.string().trim().min(1).max(100),
  limit: z.number().int().min(1).max(50).default(10),
  envelopeId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
}).strict();
export type SearchTransactionsQuery = z.infer<typeof SearchTransactionsQuery>;

/**
 * Query schema for listing transactions scoped to a specific envelope.
 */
export const ListEnvelopeTransactionsQuery = z.object({
  envelopeId: z.string().uuid().optional(),
  limit: z.number().int().max(100).default(30),
  offset: z.number().int().default(0),
}).strict();
