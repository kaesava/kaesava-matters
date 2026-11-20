/**
 * Pure payday split draft calculation helpers shared across Web and Mobile.
 */

export function sanitizeDecimalInput(val: string, maxIntDigits = 12): string {
  let cleaned = val.replace(/[^0-9.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length > 2) cleaned = `${parts[0]}.${parts.slice(1).join("")}`;
  if (parts[0].length > maxIntDigits) {
    parts[0] = parts[0].slice(0, maxIntDigits);
    cleaned = parts[1] !== undefined ? `${parts[0]}.${parts[1]}` : parts[0];
  }
  if (parts[1] && parts[1].length > 2) cleaned = `${parts[0]}.${parts[1].slice(0, 2)}`;
  return cleaned;
}

interface PaydayAllocationSummary {
  nonSweepAllocatedSum: number;
  sweepPoolRemainder: number;
  isDeficit: boolean;
  everydayAllocated: number;
  billsAllocated: number;
  goalsAllocated: number;
}

export function computePaydayAllocationSummary(
  numericActual: number,
  sweepPoolId: string | undefined,
  lines: ReadonlyArray<{ bucketId: string; proposedAmount: number; envelopeType?: string }>,
  linesMap: Record<string, string>
): PaydayAllocationSummary {
  const nonSweepAllocatedSum = sweepPoolId
    ? Object.entries(linesMap).reduce(
        (acc, [bId, valStr]) => (bId === sweepPoolId ? acc : acc + (parseFloat(valStr) || 0)),
        0
      )
    : 0;

  const roundedRemainder = Math.round((numericActual - nonSweepAllocatedSum) * 100) / 100;
  const sweepPoolRemainder =
    Object.is(roundedRemainder, -0) || Math.abs(roundedRemainder) < 0.005
      ? 0
      : Math.max(-999999, roundedRemainder);

  const sumByType = (targetType: string) =>
    lines
      .filter((l) => l.envelopeType === targetType)
      .reduce((sum, l) => {
        const val =
          l.bucketId === sweepPoolId && targetType === "EVERYDAY"
            ? Math.max(0, sweepPoolRemainder)
            : parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0;
        return sum + val;
      }, 0);

  return {
    nonSweepAllocatedSum,
    sweepPoolRemainder,
    isDeficit: sweepPoolRemainder < -0.01,
    everydayAllocated: sumByType("EVERYDAY"),
    billsAllocated: sumByType("BILL"),
    goalsAllocated: sumByType("GOAL"),
  };
}

export interface TwoLevelPaydaySummary {
  sharedAllocated: number;
  sharedRemainder: number;
  isSharedDeficit: boolean;
  privateAllocated: number;
  privateRemainder: number;
  isPrivateDeficit: boolean;
  isDeficit: boolean;
}

export function computeTwoLevelPaydaySummary(
  sharedAmount: number,
  privateAmount: number,
  sharedSweepId: string | undefined,
  privateEverydayId: string | undefined,
  lines: ReadonlyArray<{ bucketId: string; proposedAmount: number; isPrivate?: boolean }>,
  linesMap: Record<string, string>
): TwoLevelPaydaySummary {
  const sumNonSweep = (isPrivateScope: boolean, sweepId: string | undefined) =>
    lines
      .filter((l) => Boolean(l.isPrivate) === isPrivateScope && l.bucketId !== sweepId)
      .reduce((acc, l) => acc + (parseFloat(linesMap[l.bucketId] ?? l.proposedAmount.toString()) || 0), 0);

  const sharedNonSweep = sumNonSweep(false, sharedSweepId);
  const sharedRemRaw = Math.round((sharedAmount - sharedNonSweep) * 100) / 100;
  const sharedRemainder = Object.is(sharedRemRaw, -0) || Math.abs(sharedRemRaw) < 0.005 ? 0 : sharedRemRaw;

  const privateNonSweep = sumNonSweep(true, privateEverydayId);
  const privateRemRaw = Math.round((privateAmount - privateNonSweep) * 100) / 100;
  const privateRemainder = Object.is(privateRemRaw, -0) || Math.abs(privateRemRaw) < 0.005 ? 0 : privateRemRaw;

  return {
    sharedAllocated: sharedNonSweep + (sharedSweepId ? Math.max(0, sharedRemainder) : 0),
    sharedRemainder,
    isSharedDeficit: sharedRemainder < -0.01,
    privateAllocated: privateNonSweep + (privateEverydayId ? Math.max(0, privateRemainder) : 0),
    privateRemainder,
    isPrivateDeficit: privateRemainder < -0.01,
    isDeficit: sharedRemainder < -0.01 || privateRemainder < -0.01,
  };
}

export interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

export interface ComputeBankTransferRollupParams {
  envelopes: ReadonlyArray<{ id: string; name: string; bankAccountId?: string | null; bankAccountName?: string | null }>;
  linesMap: Record<string, string>;
  sweepEnvelopeId?: string;
  sweepRemainder: number;
  receivingAccountId?: string | null;
  bankAccounts: ReadonlyArray<{ id: string; name: string; payId?: string | null }>;
  sourceAccountName: string;
  defaultDestAccountName: string;
}

export function computeBankTransferRollup({
  envelopes,
  linesMap,
  sweepEnvelopeId,
  sweepRemainder,
  receivingAccountId,
  bankAccounts,
  sourceAccountName,
  defaultDestAccountName,
}: ComputeBankTransferRollupParams) {
  const retained: Array<{ id: string; name: string; amount: number }> = [];
  const transferMap = new Map<string, DestinationTransferGroup>();

  for (const env of envelopes) {
    const amount =
      env.id === sweepEnvelopeId
        ? Math.max(0, sweepRemainder)
        : parseFloat(linesMap[env.id] || "0");
    if (amount <= 0.005) continue;

    const isSameAccount =
      (receivingAccountId && env.bankAccountId === receivingAccountId) ||
      (!env.bankAccountId && (!receivingAccountId || env.bankAccountId === receivingAccountId));

    if (isSameAccount) {
      retained.push({ id: env.id, name: env.name, amount });
      continue;
    }

    const destId = env.bankAccountId || "unknown-dest";
    const destAcc = bankAccounts.find((a) => a.id === destId);
    const destName = env.bankAccountName || destAcc?.name || defaultDestAccountName;
    const existing = transferMap.get(destId);
    if (existing) {
      existing.totalAmount += amount;
      existing.pools.push({ id: env.id, name: env.name, amount });
    } else {
      transferMap.set(destId, {
        destAccountId: destId,
        destAccountName: destName,
        sourceAccountName,
        totalAmount: amount,
        payId: destAcc?.payId,
        pools: [{ id: env.id, name: env.name, amount }],
      });
    }
  }

  return {
    retainedItems: retained,
    retainedTotal: retained.reduce((s, r) => s + r.amount, 0),
    externalTransfers: Array.from(transferMap.values()).filter((g) => g.totalAmount > 0.005),
  };
}
