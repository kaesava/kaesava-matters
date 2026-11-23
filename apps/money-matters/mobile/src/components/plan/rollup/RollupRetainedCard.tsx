import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS, InfoTooltip } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { formatMobileCurrency } from '../../../lib/format';

interface RollupRetainedCardProps {
  readonly sourceAccountName: string;
  readonly retainedTotal: number;
  readonly retainedItems: Array<{ id: string; name: string; amount: number }>;
}

export const RollupRetainedCard: React.FC<RollupRetainedCardProps> = ({
  sourceAccountName,
  retainedTotal,
  retainedItems,
}) => {
  return (
    <View style={styles.retainedCard}>
      <View style={styles.retainedHeader}>
        <View style={styles.retainedTitleRow}>
          <Text style={styles.checkmarkIcon}>✓</Text>
          <Text style={styles.retainedTitle}>
            {t('cards.paydayTransfer.retainedTitle')} {sourceAccountName}
          </Text>
        </View>
        <Text style={styles.retainedAmountText}>
          {formatMobileCurrency(retainedTotal)}
        </Text>
      </View>

      <View style={styles.retainedDescRow}>
        <Text style={styles.retainedDesc}>
          {t('cards.paydayTransfer.noTransferNeeded')}
        </Text>
        <InfoTooltip
          title={`${t('cards.paydayTransfer.retainedTitle')} ${sourceAccountName}`}
          content={retainedItems.map((r) => `${r.name} (${formatMobileCurrency(r.amount)})`).join(', ')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  retainedCard: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
    borderRadius: 14,
    padding: 12,
    gap: 6,
  },
  retainedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  retainedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  checkmarkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: DESIGN_TOKENS.colors.successDark,
  },
  retainedTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  retainedAmountText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.successDark,
  },
  retainedDescRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  retainedDesc: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.successDark,
    lineHeight: 16,
  },
});
