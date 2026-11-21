import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { formatMobileCurrency, formatDate } from '../lib/format';

export interface TransactionRowProps {
  id?: string;
  amount: string | number;
  flowType: 'DEBIT' | 'CREDIT' | 'TRANSFER';
  rawFlowType?: 'DEBIT' | 'CREDIT';
  poolName?: string | null;
  categoryName?: string | null;
  note?: string | null;
  recordedAt: string | Date;
  sourcePoolName?: string | null;
  destPoolName?: string | null;
  onPress?: () => void;
}

export function TransactionRow({
  amount,
  flowType,
  rawFlowType,
  poolName,
  categoryName,
  note,
  recordedAt,
  onPress,
}: TransactionRowProps) {
  const isTransfer =
    flowType === 'TRANSFER' ||
    (note && (note.includes('Transfer to') || note.includes('Transfer from') || note.includes('➔')));

  // Use rawFlowType (DEBIT/CREDIT) if provided, or derive from flowType
  const effectiveFlow = rawFlowType || (flowType === 'DEBIT' ? 'DEBIT' : flowType === 'CREDIT' ? 'CREDIT' : 'DEBIT');
  const isDebit = effectiveFlow === 'DEBIT';

  // Fallback label for display
  const displayName = categoryName || poolName || (isTransfer ? 'Transfer' : 'Transaction');

  // Primary info: Date & Description (note or displayName)
  const primaryDescription = note || displayName;
  const secondaryPool = note ? (poolName || categoryName) : null;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.cardHeader}>
        <View style={styles.left}>
          <Text style={styles.date}>{formatDate(recordedAt)}</Text>
          <View style={styles.descriptionRow}>
            <Text style={styles.description} numberOfLines={1}>
              {primaryDescription}
            </Text>
          </View>
        </View>

        <View style={styles.right}>
          <Text
            style={[
              styles.amount,
              isDebit ? styles.debitAmount : styles.creditAmount,
            ]}
          >
            {isDebit ? '-' : '+'}
            {formatMobileCurrency(amount)}
          </Text>
          {onPress && <Feather name="chevron-right" size={18} color={DESIGN_TOKENS.colors.slate[400]} />}
        </View>
      </View>

      {secondaryPool && (
        <View style={styles.cardFooter}>
          <View style={styles.poolWrap}>
            <View style={styles.iconWrap}>
              {isTransfer ? (
                <Feather name="repeat" size={11} color={DESIGN_TOKENS.colors.sereneBlue} />
              ) : isDebit ? (
                <Feather name="arrow-up-right" size={11} color={DESIGN_TOKENS.colors.burnRed} />
              ) : (
                <Feather name="arrow-down-left" size={11} color={DESIGN_TOKENS.colors.success} />
              )}
            </View>
            <Text style={styles.poolName} numberOfLines={1}>
              {secondaryPool}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 56,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  left: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.slate[400],
    marginBottom: 3,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  description: {
    fontSize: 14,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  debitAmount: {
    color: DESIGN_TOKENS.colors.burnRed,
  },
  creditAmount: {
    color: DESIGN_TOKENS.colors.success,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[50],
    paddingTop: 8,
  },
  poolWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  iconWrap: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  poolName: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textMuted,
  },
});

export default TransactionRow;
