import type { z } from "zod";
import { SearchAddressesInput, searchAddressesQuery } from "../index.js";

export interface GeoProcedureContext {
  userId?: string;
  tenantId?: string | null;
  env?: { UPSTASH_REDIS_REST_URL?: string; UPSTASH_REDIS_REST_TOKEN?: string };
}

export interface GeoProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(
      fn: (opts: { ctx: GeoProcedureContext; input: z.infer<TSchema> }) => Promise<TOut>
    ): TProc;
  };
}

export interface CreateGeoRouterDeps<TProc> {
  authenticatedProcedure: GeoProcedureBuilder<TProc>;
}

/**
 * Adapter-driven composable geo router factory.
 * Keeps Ring 2 free of direct `@trpc/server` imports.
 */
export function createGeoRouter<TProc>(deps: CreateGeoRouterDeps<TProc>) {
  return {
    searchAddresses: deps.authenticatedProcedure
      .input(SearchAddressesInput)
      .query(async ({ ctx, input }) => {
        const rateLimitKey = ctx.tenantId ?? ctx.userId ?? "anonymous";
        return searchAddressesQuery(input, { rateLimitKey, env: ctx.env });
      }),
  };
}
