import { bankAccounts, type DbOrTx } from "@money-matters/db";
import { and, eq, sql } from "drizzle-orm";
import type { ContributionMode } from "./income-sources.command.js";

/**
 * Validates contributionMode/contributionValue against totalAmount.
 * Rejects PERCENTAGE outside [0, 100] and FIXED_AMOUNT outside [0, totalAmount].
 */
export function validateContributionCap(
  mode: ContributionMode | undefined,
  value: string | null | undefined,
  total: string
): void {
  if (!mode || mode === "FULL") return;
  const numVal = value ? parseFloat(value) : NaN;
  if (mode === "PERCENTAGE") {
    if (isNaN(numVal) || numVal < 0 || numVal > 100) {
      throw new Error("Household contribution percentage must be between 0 and 100.");
    }
    return;
  }
  if (mode === "FIXED_AMOUNT") {
    const totalNum = parseFloat(total);
    if (isNaN(numVal) || numVal < 0 || (!isNaN(totalNum) && numVal > totalNum)) {
      throw new Error("Household contribution cannot exceed the expected income amount.");
    }
  }
}

/**
 * Returns true if the given receivingAccountId is a private bank account owned by userId.
 */
export async function isReceivingAccountPrivate(
  accountId: string | null | undefined,
  tenantId: string,
  appId: string,
  userId: string,
  db: DbOrTx
): Promise<boolean> {
  if (!accountId) return false;
  const [acc] = await db
    .select({ isPrivate: bankAccounts.isPrivate, userId: bankAccounts.userId })
    .from(bankAccounts)
    .where(
      and(
        eq(bankAccounts.id, accountId),
        eq(bankAccounts.tenantId, tenantId),
        eq(bankAccounts.appId, appId),
        sql`${bankAccounts.archivedAt} IS NULL`
      )
    )
    .limit(1);
  return Boolean(acc?.isPrivate && acc.userId === userId);
}

/**
 * Resolves and validates contributionMode/contributionValue.
 * Shared-account incomes are always forced to FULL (100% shared).
 */
export async function resolveValidatedIncomeContribution(params: {
  mode: ContributionMode | undefined;
  value: string | null | undefined;
  totalAmount: string;
  receivingAccountId: string | null | undefined;
  tenantId: string;
  appId: string;
  userId: string;
  db: DbOrTx;
}): Promise<{ contributionMode: ContributionMode; contributionValue: string | null }> {
  const isPrivate = await isReceivingAccountPrivate(
    params.receivingAccountId,
    params.tenantId,
    params.appId,
    params.userId,
    params.db
  );
  if (!isPrivate || !params.mode || params.mode === "FULL") {
    return { contributionMode: "FULL", contributionValue: null };
  }
  validateContributionCap(params.mode, params.value, params.totalAmount);
  return {
    contributionMode: params.mode,
    contributionValue: params.value ?? null,
  };
}
