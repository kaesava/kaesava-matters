import { DbOrTx } from "./types.js";
import { transactionLedger } from "./schema/transaction_ledger.js";
import { and, eq, sql } from "drizzle-orm";

/**
 * Computes net balances per envelope using DB-side aggregate SUM(CASE WHEN flowType='CREDIT' ...).
 * Replaces O(N) full ledger fetches with a single grouped DB query.
 */
export async function getEnvelopeBalancesMap(
  tenantId: string,
  appId: string,
  dbClient: DbOrTx
): Promise<Record<string, number>> {
  const rows = await dbClient
    .select({
      envelopeId: transactionLedger.envelopeId,
      balance: sql<string>`COALESCE(SUM(CASE WHEN ${transactionLedger.flowType} = 'CREDIT' THEN ${transactionLedger.amount}::numeric ELSE -${transactionLedger.amount}::numeric END), 0)::text`,
    })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        sql`${transactionLedger.archivedAt} IS NULL`
      )
    )
    .groupBy(transactionLedger.envelopeId);

  const balancesMap: Record<string, number> = {};
  for (const r of rows) {
    if (r?.envelopeId) {
      const val = parseFloat(r.balance || "0");
      balancesMap[r.envelopeId] = (balancesMap[r.envelopeId] || 0) + (isNaN(val) ? 0 : val);
    }
  }
  return balancesMap;
}
