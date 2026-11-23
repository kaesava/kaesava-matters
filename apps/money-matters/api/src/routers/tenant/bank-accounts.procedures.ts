import { privateTenantProcedure, requiresWriteAccess } from '../../trpc/trpc.js';
import { bankAccounts } from "@kaesava/db";
import { and, eq, sql, or } from "drizzle-orm";
import {
  createBankAccountHandler,
  updateBankAccountHandler,
  archiveBankAccountHandler,
  getBankAccountsWithMappingsHandler,
  listBankAccountsWithExpectedHandler,
  syncBankBalanceHandler,
} from "@kaesava/capability-bank-accounts";
import { moneyMattersBankAccountHooks } from "@money-matters/capability-budgeting";
import { CreateBankAccountCommand, UpdateBankAccountCommand } from "@kaesava/types";
import { z } from 'zod';
import { captureIfConsented } from '../../lib/posthog.js';

export const bankAccountsProcedures = {
  createBankAccount: privateTenantProcedure
    .input(CreateBankAccountCommand)
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = createBankAccountHandler(ctx.db, moneyMattersBankAccountHooks);
      const result = await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
      await captureIfConsented(ctx.db, ctx.userId, 'bank_account_created', {
        tenant_id: ctx.tenantId,
        account_type: input.accountType,
      });
      return result;
    }),

  updateBankAccount: privateTenantProcedure
    .input(z.object({
      accountId: z.string().uuid(),
      data: UpdateBankAccountCommand
    }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = updateBankAccountHandler(ctx.db);
      return await handler(input.accountId, input.data, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  archiveBankAccount: privateTenantProcedure
    .input(z.object({ accountId: z.string().uuid() }).strict())
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const [acc] = await ctx.db
        .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.id, input.accountId),
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`
          )
        )
        .limit(1);

      if (!acc) throw new Error("Bank account not found or access unauthorized.");
      if (acc.isPrivate) {
        if (acc.userId !== ctx.userId) throw new Error("Bank account not found or access unauthorized.");
      } else if (ctx.session?.role !== "OWNER") {
        throw new Error("Only household owners can archive shared bank accounts.");
      }

      const handler = archiveBankAccountHandler(ctx.db, moneyMattersBankAccountHooks);
      return await handler(input.accountId, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  getBankAccountsWithMappings: privateTenantProcedure
    .query(async ({ ctx }) => {
      const handler = getBankAccountsWithMappingsHandler(ctx.db, moneyMattersBankAccountHooks);
      return await handler(ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  listBankAccounts: privateTenantProcedure
    .query(async ({ ctx }) => {
      return await ctx.db
        .select()
        .from(bankAccounts)
        .where(
          and(
            eq(bankAccounts.tenantId, ctx.tenantId!),
            eq(bankAccounts.appId, ctx.appId!),
            sql`${bankAccounts.archivedAt} IS NULL`,
            or(eq(bankAccounts.isPrivate, false), eq(bankAccounts.userId, ctx.userId!))!
          )
        );
    }),

  listBankAccountsWithExpected: privateTenantProcedure
    .query(async ({ ctx }) => {
      const handler = listBankAccountsWithExpectedHandler(ctx.db, moneyMattersBankAccountHooks);
      return await handler(ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),

  syncBankBalance: privateTenantProcedure
    .input(
      z.object({
        accountId: z.string().uuid(),
        actualBalance: z.string().regex(/^\d+(\.\d{1,2})?$/),
        clientIdempotencyToken: z.string().uuid(),
        note: z.string().optional(),
        splits: z.array(
          z.object({
            envelopeId: z.string().uuid().optional(),
            poolId: z.string().uuid().optional(),
            adjustment: z.string().regex(/^-?\d+(\.\d{1,2})?$/),
          }).strict()
        ),
      }).strict()
    )
    .mutation(async ({ input, ctx }) => {
      requiresWriteAccess(ctx);
      const handler = syncBankBalanceHandler(ctx.db, moneyMattersBankAccountHooks);
      return await handler(input, ctx.tenantId!, ctx.appId!, ctx.userId!);
    }),
};
