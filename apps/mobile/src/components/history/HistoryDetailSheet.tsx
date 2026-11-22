import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { MobileModalDialog, MobileButton, MobileDetailLinkRow, DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { formatMobileCurrency, formatDate } from '../../lib/format';

export interface TransactionDetailRecord {
  id: string;
  amount: string | number;
  flowType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  rawFlowType?: 'DEBIT' | 'CREDIT';
  transactionType?: string | null;
  poolId?: string | null;
  poolName?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  bankAccountId?: string | null;
  bankAccountName?: string | null;
  note?: string | null;
  recordedAt: string | Date;
  source?: string | null;
  isTransfer?: boolean;
}

interface HistoryDetailSheetProps {
  visible: boolean;
  transaction: TransactionDetailRecord | null;
  onClose: () => void;
  onNavigateToPool?: (poolId: string) => void;
}

export function HistoryDetailSheet({
  visible,
  transaction,
  onClose,
  onNavigateToPool,
}: HistoryDetailSheetProps) {
  const router = useRouter();
  if (!transaction) return null;

  const isDebit = transaction.rawFlowType === 'DEBIT' || transaction.flowType === 'DEBIT';
  const amountStr = `${isDebit ? '-' : '+'}${formatMobileCurrency(transaction.amount)}`;
  const displayPool = transaction.poolName || transaction.categoryName || t('categories.mainEnvelope');

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t('history.details')}
      subtitle={formatDate(transaction.recordedAt)}
      footer={
        <View style={styles.footerWrap}>
          {transaction.poolId && onNavigateToPool ? (
            <MobileButton
              variant="primary"
              onPress={() => {
                onClose();
                onNavigateToPool(transaction.poolId!);
              }}
            >
              {t('categories.title')}
            </MobileButton>
          ) : (
            <MobileButton variant="secondary" onPress={onClose}>
              {t('common.close')}
            </MobileButton>
          )}
        </View>
      }
    >
      <View style={styles.container}>
        {/* Hero Amount Display */}
        <View style={styles.heroBox}>
          <Text style={[styles.heroAmount, isDebit ? styles.debitText : styles.creditText]}>
            {amountStr}
          </Text>
          <View style={[styles.flowBadge, isDebit ? styles.debitBadge : styles.creditBadge]}>
            <Text style={[styles.flowBadgeText, isDebit ? styles.debitBadgeText : styles.creditBadgeText]}>
              {transaction.isTransfer
                ? t('common.transfer')
                : isDebit
                ? t('common.expense')
                : t('common.income')}
            </Text>
          </View>
        </View>

        {/* Audit Metadata Rows */}
        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('common.description')}</Text>
            <Text style={styles.metaValue}>{transaction.note || displayPool}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('categories.typeLabel')}</Text>
            <Text style={styles.metaValueHighlight}>{displayPool}</Text>
          </View>

          {transaction.bankAccountName && (
            <>
              <View style={styles.divider} />
              <MobileDetailLinkRow
                label={t('bankAccounts.title')}
                value={transaction.bankAccountName}
                onPress={
                  transaction.bankAccountId
                    ? () => {
                        onClose();
                        router.push(`/(app)/bank-accounts?id=${transaction.bankAccountId}` as Href);
                      }
                    : undefined
                }
              />
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t('tables.date')}</Text>
            <Text style={styles.metaValueMono}>{formatDate(transaction.recordedAt)}</Text>
          </View>
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingBottom: 8,
  },
  heroBox: {
    alignItems: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  heroAmount: {
    fontSize: 32,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  debitText: { color: DESIGN_TOKENS.colors.critical },
  creditText: { color: DESIGN_TOKENS.colors.success },
  flowBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  debitBadge: { backgroundColor: DESIGN_TOKENS.colors.criticalLight },
  creditBadge: { backgroundColor: DESIGN_TOKENS.colors.successLight },
  flowBadgeText: { fontSize: 12, fontWeight: '800' },
  debitBadgeText: { color: DESIGN_TOKENS.colors.critical },
  creditBadgeText: { color: DESIGN_TOKENS.colors.successDark },
  metaCard: {
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 10,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.subtleText,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.primary,
    maxWidth: '65%',
    textAlign: 'right',
  },
  metaValueHighlight: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.sereneBlue,
    maxWidth: '65%',
    textAlign: 'right',
  },
  metaValueMono: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  footerWrap: {
    paddingTop: 8,
  },
});
