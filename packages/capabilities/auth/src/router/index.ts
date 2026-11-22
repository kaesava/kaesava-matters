import { z } from "zod";
import { DbOrTx } from "@money-matters/db/rings/capabilities";
import {
  checkEmailAuthProviderHandler,
  getAuthMethodsHandler,
  setAccountPasswordHandler,
} from "../handlers/auth-provider";

const checkEmailAuthProviderInput = z.object({ email: z.string().email() }).strict();
const setAccountPasswordInput = z.object({ newPassword: z.string().min(8).max(128) }).strict();

export interface AuthRouterProcedureBuilder<TProc> {
  input<TSchema extends z.ZodTypeAny>(schema: TSchema): {
    query<TOut>(fn: (opts: { ctx: { db: DbOrTx; userId?: string }; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
    mutation<TOut>(fn: (opts: { ctx: { db: DbOrTx; userId: string }; input: z.infer<TSchema> }) => Promise<TOut>): TProc;
  };
  query<TOut>(fn: (opts: { ctx: { db: DbOrTx; userId: string } }) => Promise<TOut>): TProc;
}

/**
 * Creates composable auth procedures using injected tRPC procedure builders,
 * keeping Ring 2 free of direct `@trpc/server` imports.
 */
export function createAuthProcedures<TProc>(deps: {
  publicProcedure: AuthRouterProcedureBuilder<TProc>;
  protectedProcedure: AuthRouterProcedureBuilder<TProc>;
  hashPassword: (password: string) => Promise<string>;
}) {
  return {
    checkEmailAuthProvider: deps.publicProcedure
      .input(checkEmailAuthProviderInput)
      .query(async ({ ctx, input }) => checkEmailAuthProviderHandler(ctx.db)(input.email)),

    getAuthMethods: deps.protectedProcedure
      .query(async ({ ctx }) => getAuthMethodsHandler(ctx.db)(ctx.userId)),

    setAccountPassword: deps.protectedProcedure
      .input(setAccountPasswordInput)
      .mutation(async ({ ctx, input }) =>
        setAccountPasswordHandler(ctx.db, deps.hashPassword)(ctx.userId, input.newPassword)
      ),
  };
}
