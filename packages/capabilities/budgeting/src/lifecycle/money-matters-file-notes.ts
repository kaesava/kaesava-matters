import { bankAccounts, envelopes, type DbOrTx } from "@money-matters/db";
import type { EntityPrivacyResolverMap } from "@money-matters/types";
import { and, eq, isNull } from "drizzle-orm";

export const moneyMattersFileNotePrivacyResolvers: EntityPrivacyResolverMap<DbOrTx> = {
  BANK_ACCOUNT: async (db, ctx, entityId) => {
    const [acc] = await db
      .select({ id: bankAccounts.id, isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
      .from(bankAccounts)
      .where(and(eq(bankAccounts.id, entityId), eq(bankAccounts.tenantId, ctx.tenantId), isNull(bankAccounts.archivedAt)))
      .limit(1);
    if (!acc) return { exists: false, isPrivate: false, ownerUserId: null };
    return { exists: true, isPrivate: acc.isPrivate, ownerUserId: acc.userId };
  },
  ENVELOPE: async (db, ctx, entityId) => {
    const [env] = await db
      .select({ id: envelopes.id, isPrivate: envelopes.isPrivate, userId: envelopes.userId })
      .from(envelopes)
      .where(and(eq(envelopes.id, entityId), eq(envelopes.tenantId, ctx.tenantId), isNull(envelopes.archivedAt)))
      .limit(1);
    if (!env) return { exists: false, isPrivate: false, ownerUserId: null };
    return { exists: true, isPrivate: env.isPrivate, ownerUserId: env.userId };
  },
};
