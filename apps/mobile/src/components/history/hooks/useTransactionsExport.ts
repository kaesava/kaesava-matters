import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { t } from '@kaesava/i18n';
import { serializeCsvRows } from '@kaesava/types';
import { formatDate, formatIsoDate } from '../../../lib/format';
import { LedgerTxItem } from '../LedgerHistoryTab';
import { MobilePaydayAllocationRecord } from '../../plan/MobilePaydayPlanDetailModal';

export function useTransactionsExport() {
  const exportLedgerCsv = async (transactions: LedgerTxItem[]) => {
    if (transactions.length === 0) return;
    const headers = [
      t('tables.date'),
      t('common.amount'),
      t('common.type'),
      t('history.csvEnvelope'),
      t('history.exportHeaders.account'),
      t('history.exportHeaders.note'),
    ];
    const rows = transactions.map((tx) => [
      formatDate(tx.recordedAt),
      tx.amount,
      tx.effectiveType === 'DEBIT'
        ? t('common.expense')
        : tx.effectiveType === 'CREDIT'
          ? t('common.income')
          : t('common.transfer'),
      tx.poolName || tx.categoryName || '',
      tx.bankAccountName || '',
      tx.note || '',
    ]);
    const csv = serializeCsvRows(headers, rows);
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}transactions_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: t('history.exportTransactionsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  const exportPlansCsv = async (plans: MobilePaydayAllocationRecord[]) => {
    if (plans.length === 0) return;
    const headers = [
      t('history.csvPaydayPlanDate'),
      t('history.csvIncomeDate'),
      t('history.csvIncomeSource'),
      t('history.csvBankAccount'),
      t('history.csvTotalIncome'),
      t('history.csvEnvelope'),
      t('history.csvPlannedAmount'),
      t('history.csvReasoning'),
    ];
    const rows: unknown[][] = [];
    for (const p of plans) {
      const splitDate = formatDate(p.createdAt);
      const incDate = formatDate(p.expectedDate || p.createdAt);
      if (p.lines && p.lines.length > 0) {
        for (const line of p.lines) {
          rows.push([
            splitDate,
            incDate,
            p.incomeName || '',
            p.receivingAccountName || '',
            p.totalIncomeAmount,
            line.poolName || '',
            line.confirmedAmount || line.proposedAmount,
            line.reasoning || '',
          ]);
        }
      } else {
        rows.push([splitDate, incDate, p.incomeName || '', p.receivingAccountName || '', p.totalIncomeAmount, '', '', '']);
      }
    }
    const csv = serializeCsvRows(headers, rows);
    try {
      const fileUri = `${FileSystem.cacheDirectory || FileSystem.documentDirectory}payday_plans_${formatIsoDate(new Date())}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: t('history.exportSplitsDialog'),
        });
      }
    } catch {
      // Ignored
    }
  };

  return { exportLedgerCsv, exportPlansCsv };
}
