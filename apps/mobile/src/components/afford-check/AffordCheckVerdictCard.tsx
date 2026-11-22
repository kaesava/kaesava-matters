import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import type { CanAffordVerdictType } from '@kaesava/types';
import { formatDate, formatMobileCurrency } from '../../lib/format';

interface AffordCheckVerdictCardProps {
  data: CanAffordVerdictType;
}

export function AffordCheckVerdictCard({ data }: AffordCheckVerdictCardProps) {
  const verdict = data.verdict;
  const canAffordAt = 'canAffordAt' in data ? data.canAffordAt : null;
  const formattedDate = canAffordAt ? formatDate(canAffordAt) : '';
  const startAdvice = 'startAdvice' in data ? data.startAdvice : undefined;

  return (
    <View
      style={[
        styles.verdictBox,
        verdict === 'SAFE_YES'
          ? styles.verdictGreen
          : verdict === 'HARD_NO'
          ? styles.verdictRed
          : styles.verdictAmber,
      ]}
    >
      <Text style={styles.verdictTitle}>
        {verdict === 'SAFE_YES' && t('canIAfford.verdictSafeYes')}
        {verdict === 'PACING_TIGHT' && t('canIAfford.verdictPacingTight')}
        {verdict === 'BILLS_RISK' && t('canIAfford.verdictBillsRisk')}
        {verdict === 'WAIT_FOR_PAYCYCLE' && t('canIAfford.verdictWaitForPaycycle', { date: formattedDate })}
        {verdict === 'GOAL_DELAYED' && t('canIAfford.verdictGoalDelayed')}
        {verdict === 'HARD_NO' && t('canIAfford.verdictHardNo')}
      </Text>

      {data.verdict === 'SAFE_YES' && (
        <View style={styles.detailGroup}>
          <Text style={styles.detailPrimary}>
            {t('canIAfford.remainingUntilPayday', {
              amount: formatMobileCurrency(data.everydayRemaining),
              date: formatDate(data.nextPaydayDate),
            })}
          </Text>
          <Text style={styles.detailSub}>
            {t('canIAfford.safeCushionLabel', { amount: formatMobileCurrency(data.safeCushion) })} • {t('canIAfford.billsProtectedNotice')}
          </Text>
        </View>
      )}

      {data.verdict === 'PACING_TIGHT' && (
        <View style={styles.detailGroup}>
          <Text style={styles.detailPrimary}>
            {t('canIAfford.remainingUntilPayday', {
              amount: formatMobileCurrency(data.everydayRemaining),
              date: formatDate(data.nextPaydayDate),
            })}
          </Text>
          <Text style={styles.detailSub}>
            {t('canIAfford.tightCushionNotice', {
              amount: formatMobileCurrency(data.cushionShortfall),
              cushion: formatMobileCurrency(data.safeCushion),
            })}
          </Text>
        </View>
      )}

      {data.verdict === 'BILLS_RISK' && (
        <View style={styles.detailGroup}>
          <Text style={styles.detailPrimary}>
            {t('canIAfford.billsBeforePayday')}: {formatMobileCurrency(data.upcomingBillsBeforePayday)} • {t('canIAfford.netEffectiveSpendable')}: {formatMobileCurrency(data.effectiveAfterBills)}
          </Text>
          {data.billsDueItems.length > 0 && (
            <View style={styles.billsList}>
              {data.billsDueItems.map((bill, idx) => (
                <View key={`${bill.name}-${idx}`} style={styles.billRow}>
                  <Text style={styles.billName}>{bill.name}</Text>
                  <Text style={styles.billMeta}>
                    {formatDate(bill.dueDate)} • {formatMobileCurrency(bill.amount)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {data.verdict === 'WAIT_FOR_PAYCYCLE' && (
        <View style={styles.detailGroup}>
          <Text style={styles.detailPrimary}>
            {t('canIAfford.shortfallLabel', { amount: formatMobileCurrency(data.shortfallToday) })} • {t('canIAfford.paycyclesAwayLabel', { n: data.paycyclesAway })}
          </Text>
          <Text style={styles.detailSub}>
            {t('canIAfford.projectedEverydayLabel', { amount: formatMobileCurrency(data.projectedEverydayAtThatDate) })}
          </Text>
        </View>
      )}

      {data.verdict === 'GOAL_DELAYED' && (
        <View style={styles.detailGroup}>
          <Text style={styles.detailPrimary}>
            {t('canIAfford.recurringMonthlyImpactLabel', { amount: formatMobileCurrency(data.recurringMonthlyImpact) })} • {t('canIAfford.goalDelayCount', { count: data.goalDelays.length })}
          </Text>
          <Text style={styles.detailSub}>{t('canIAfford.billsProtectedNotice')}</Text>
        </View>
      )}

      {data.verdict === 'HARD_NO' && (
        <Text style={styles.detailPrimary}>
          {t('canIAfford.shortfallLabel', { amount: formatMobileCurrency(data.shortfall) })} • {t('canIAfford.horizon12Months')}
        </Text>
      )}

      {startAdvice && (
        <View style={styles.adviceBox}>
          <Text style={styles.adviceText}>
            💡 {t('canIAfford.startAdviceLabel', { advice: startAdvice })}
          </Text>
        </View>
      )}

      {data.rationaleSteps && data.rationaleSteps.length > 0 && (
        <View style={styles.rationaleList}>
          {data.rationaleSteps.map((step, idx) => (
            <Text key={idx} style={styles.rationaleStep}>
              • {step}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  verdictBox: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    gap: 8,
  },
  verdictGreen: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  verdictRed: {
    backgroundColor: DESIGN_TOKENS.colors.criticalLight,
    borderColor: DESIGN_TOKENS.colors.criticalBorder,
  },
  verdictAmber: {
    backgroundColor: DESIGN_TOKENS.colors.warningLight,
    borderColor: DESIGN_TOKENS.colors.warningBorder,
  },
  verdictTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
  },
  detailGroup: {
    gap: 4,
  },
  detailPrimary: {
    fontSize: 13,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
  detailSub: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  billsList: {
    marginTop: 6,
    gap: 4,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: DESIGN_TOKENS.colors.surface,
  },
  billName: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
  billMeta: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
  },
  adviceBox: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.border,
  },
  adviceText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.primary,
  },
  rationaleList: {
    gap: 4,
    marginTop: 4,
  },
  rationaleStep: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.slate[600],
    lineHeight: 16,
  },
});
