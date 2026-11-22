import { DbOrTx, transactionLedger } from "@kaesava/db";
import { and, eq, inArray } from "drizzle-orm";
import type { PersistedSetupAccount } from "./save-setup-budget-accounts.js";
import type { SaveSetupEnvelopeInput } from "./save-setup-budget-envelopes.js";

interface OpeningEnvelopeCandidate {
  id: string;
  bankAccountId: string;
  envelopeType: "EVERYDAY" | "BILL" | "GOAL";
  isSurplusTarget: boolean;
  isPrivate: boolean;
}

function pickOpeningTargetEnvelope(
  account: PersistedSetupAccount,
  candidates: readonly OpeningEnvelopeCandidate[]
): OpeningEnvelopeCandidate | undefined {
  const matching = candidates.filter(
    (c) => c.bankAccountId === account.id && c.isPrivate === account.isPrivate
  );
  if (matching.length === 0) return undefined;

  return (
    matching.find((c) => c.isSurplusTarget) ||
    matching.find((c) => c.envelopeType === "EVERYDAY") ||
    matching.find((c) => c.envelopeType === "GOAL") ||
    matching[0]
  );
}

/**
 * Allocates opening bank account balances (net of Safety Cushion) into
 * linked setup envelopes for accounts that have never had ledger activity.
 * Idempotent across `/setup?mode=rerun` by skipping accounts with any prior
 * `transaction_ledger` row (active or archived).
 */
export async function allocateSetupOpeningBalances(
  tx: DbOrTx,
  params: {
    persistedAccounts: readonly PersistedSetupAccount[];
    envelopesInput: readonly SaveSetupEnvelopeInput[];
    envelopeIdMap: Map<string, string>;
    accountIdMap: Map<string, string>;
    primaryBankAccountId: string;
    tenantId: string;
    appId: string;
    userId: string;
    now: Date;
  }
): Promise<void> {
  const {
    persistedAccounts,
    envelopesInput,
    envelopeIdMap,
    accountIdMap,
    primaryBankAccountId,
    tenantId,
    appId,
    userId,
    now,
  } = params;

  const positiveAccounts = persistedAccounts.filter((acc) => {
    const balance = parseFloat(acc.lastKnownBalance || "0");
    const buffer = parseFloat(acc.unbudgetedBuffer || "0");
    return balance - buffer > 0.005;
  });
  if (positiveAccounts.length === 0) return;

  const accountIds = positiveAccounts.map((a) => a.id);
  const existingLedgerRows = await tx
    .select({ bankAccountId: transactionLedger.bankAccountId })
    .from(transactionLedger)
    .where(
      and(
        eq(transactionLedger.tenantId, tenantId),
        eq(transactionLedger.appId, appId),
        inArray(transactionLedger.bankAccountId, accountIds)
      )
    );

  const accountsWithHistory = new Set(
    existingLedgerRows
      .map((r) => r.bankAccountId)
      .filter((id): id is string => Boolean(id))
  );

  const envelopeCandidates: OpeningEnvelopeCandidate[] = envelopesInput
    .map((env) => {
      const resolvedEnvId =
        (env.id ? envelopeIdMap.get(env.id) : undefined) ||
        envelopeIdMap.get(`name-${env.name}`);
      const resolvedBankAccountId =
        (env.bankAccountId ? accountIdMap.get(env.bankAccountId) || env.bankAccountId : undefined) ||
        primaryBankAccountId;
      if (!resolvedEnvId || !resolvedBankAccountId) return null;
      return {
        id: resolvedEnvId,
        bankAccountId: resolvedBankAccountId,
        envelopeType: env.envelopeType,
        isSurplusTarget: Boolean(env.isSurplusTarget),
        isPrivate: Boolean(env.isPrivate),
      };
    })
    .filter((item): item is OpeningEnvelopeCandidate => item !== null);

  const openingEntries = positiveAccounts
    .filter((acc) => !accountsWithHistory.has(acc.id))
    .flatMap((acc) => {
      const target = pickOpeningTargetEnvelope(acc, envelopeCandidates);
      if (!target) return [];
      const available =
        parseFloat(acc.lastKnownBalance || "0") - parseFloat(acc.unbudgetedBuffer || "0");
      if (available <= 0.005) return [];
      return [
        {
          envelopeId: target.id,
          bankAccountId: acc.id,
          flowType: "CREDIT" as const,
          transactionType: "OPENING_BALANCE" as const,
          amount: available.toFixed(2),
          idempotencyKey: `setup-opening-${acc.id}`,
          note: "Opening balance",
          source: "MANUAL" as const,
          recordedAt: now,
          tenantId,
          appId,
          createdBy: userId,
          updatedBy: userId,
        },
      ];
    });

  if (openingEntries.length > 0) {
    await tx.insert(transactionLedger).values(openingEntries).onConflictDoNothing();
  }
}
