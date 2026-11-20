export interface SetupBankAccountCandidate {
  id: string;
  accountType?: string | null;
  isPrivate?: boolean | null;
}

export interface ResolveDefaultSetupBankAccountParams {
  existingBankAccountId?: string | null;
  envelopeType: "EVERYDAY" | "BILL" | "GOAL";
  isPrivate: boolean;
  bankAccounts: readonly SetupBankAccountCandidate[];
  fallbackAccountId?: string;
}

/**
 * Resolves the default bank account ID for a setup envelope, preserving any
 * explicit/existing link only if that account is still active in the wizard,
 * and otherwise matching by privacy and account type.
 */
export function resolveDefaultSetupBankAccountId({
  existingBankAccountId,
  envelopeType,
  isPrivate,
  bankAccounts,
  fallbackAccountId,
}: ResolveDefaultSetupBankAccountParams): string | undefined {
  if (existingBankAccountId && bankAccounts.some((acc) => acc.id === existingBankAccountId)) {
    return existingBankAccountId;
  }

  if (isPrivate) {
    const privateAcc = bankAccounts.find((acc) => Boolean(acc.isPrivate));
    if (privateAcc) return privateAcc.id;
  }

  const sharedAccounts = bankAccounts.filter((acc) => !acc.isPrivate);

  if (envelopeType === "GOAL") {
    const savingsAcc = sharedAccounts.find(
      (acc) => acc.accountType === "SAVINGS" || acc.accountType === "LOAN_OFFSET"
    );
    if (savingsAcc) return savingsAcc.id;
  }

  const everydayAcc = sharedAccounts.find(
    (acc) => (acc.accountType ?? "EVERYDAY") === "EVERYDAY"
  );
  return everydayAcc?.id || sharedAccounts[0]?.id || fallbackAccountId;
}
