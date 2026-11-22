import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';
import { formatMobileCurrency } from '../../../lib/format';

interface SyncBalanceValidationFooterProps {
  sumAdjustments: number;
  absVariance: number;
  isSumValid: boolean;
}

export const SyncBalanceValidationFooter: React.FC<SyncBalanceValidationFooterProps> = ({
  sumAdjustments,
  absVariance,
  isSumValid,
}) => {
  const isExceeded = !isSumValid && sumAdjustments > absVariance;
  return (
    <View style={styles.container}>
      <View style={styles.validationRow}>
        <Text style={styles.validationLabel}>
          {t('bankAccounts.reconcile.allocatedSplitTotal')}
        </Text>
        <View style={styles.validationRight}>
          <Text style={[styles.validationAmount, isSumValid ? styles.textSurplus : isExceeded ? styles.textExceeded : styles.textShortfall]}>
            {formatMobileCurrency(sumAdjustments)} / {formatMobileCurrency(absVariance)}
          </Text>
          <Text style={[styles.validationBadge, isSumValid ? styles.textSurplus : isExceeded ? styles.textExceeded : styles.textShortfall]}>
            {isSumValid
              ? t('bankAccounts.reconcile.matches')
              : isExceeded
              ? t('bankAccounts.reconcile.exceeded', { amount: formatMobileCurrency(sumAdjustments - absVariance) })
              : t('bankAccounts.reconcile.remaining', { amount: formatMobileCurrency(absVariance - sumAdjustments) })}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  validationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: DESIGN_TOKENS.colors.slate[100],
    paddingTop: 10,
  },
  validationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  validationRight: {
    alignItems: 'flex-end',
  },
  validationAmount: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  validationBadge: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  textSurplus: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  textShortfall: {
    color: DESIGN_TOKENS.colors.warningDark,
  },
  textExceeded: {
    color: DESIGN_TOKENS.colors.criticalDark,
  },
});
