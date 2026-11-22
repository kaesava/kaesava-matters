import { t } from '@kaesava/i18n';
import type { MobileBankTransferPool, MobileBankTransferAccount } from '../MobileBankTransferRollupCard';

export interface DestinationTransferGroup {
  destAccountId: string;
  destAccountName: string;
  sourceAccountName: string;
  totalAmount: number;
  payId?: string | null;
  bsb?: string | null;
  accountNumber?: string | null;
  pools: Array<{ id: string; name: string; amount: number }>;
}

interface ComputeRollupParams {
  pools: MobileBankTransferPool[];
  linesMap: Record<string, string>;
  sweepPoolId?: string;
  sweepPoolRemainder: number;
  receivingAccountId?: string | null;
  bankAccounts: MobileBankTransferAccount[];
  sourceAccountName: string;
  effectiveSourceAccountId?: string | null;
}

export function computeBankTransferRollup({
  pools,
  linesMap,
  sweepPoolId,
  sweepPoolRemainder,
  receivingAccountId,
  bankAccounts,
  sourceAccountName,
  effectiveSourceAccountId,
}: ComputeRollupParams) {
  const retained: Array<{ id: string; name: string; amount: number }> = [];
  const transferMap = new Map<string, DestinationTransferGroup>();
  const resolvedSourceId = effectiveSourceAccountId ?? receivingAccountId ?? null;

  for (const pool of pools) {
    const rawAmount =
      pool.id === sweepPoolId
        ? Math.max(0, sweepPoolRemainder)
        : parseFloat(linesMap[pool.id] || '0');
    const amount = Number.isFinite(rawAmount) ? Number(rawAmount.toFixed(2)) : 0;

    if (amount <= 0.005) continue;

    const isSameAccount = resolvedSourceId
      ? !pool.bankAccountId || pool.bankAccountId === resolvedSourceId
      : !pool.bankAccountId;

    if (isSameAccount) {
      retained.push({ id: pool.id, name: pool.name, amount });
    } else {
      const destId = pool.bankAccountId || 'unknown-dest';
      const destAcc = bankAccounts.find((a) => a.id === destId);
      const destName = pool.bankAccountName || destAcc?.name || t('cards.paydayTransfer.destAccountDefault');

      const existing = transferMap.get(destId);
      if (existing) {
        existing.totalAmount = Number((existing.totalAmount + amount).toFixed(2));
        existing.pools.push({ id: pool.id, name: pool.name, amount });
      } else {
        transferMap.set(destId, {
          destAccountId: destId,
          destAccountName: destName,
          sourceAccountName,
          totalAmount: amount,
          payId: destAcc?.payId,
          bsb: destAcc?.bsb,
          accountNumber: destAcc?.accountNumber,
          pools: [{ id: pool.id, name: pool.name, amount }],
        });
      }
    }
  }

  retained.sort((a, b) => b.amount - a.amount);
  const externalTransfers = Array.from(transferMap.values())
    .filter((g) => g.totalAmount > 0.005)
    .map((g) => ({ ...g, pools: [...g.pools].sort((a, b) => b.amount - a.amount) }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    retainedItems: retained,
    retainedTotal: Number(retained.reduce((s, r) => s + r.amount, 0).toFixed(2)),
    externalTransfers,
  };
}
