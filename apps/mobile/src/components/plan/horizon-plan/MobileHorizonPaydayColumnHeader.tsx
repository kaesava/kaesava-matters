import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';
import { formatMobileCurrency, formatDate } from '../../../lib/format';

export interface MobileMatrixColumnData {
  id: string;
  sourceName?: string;
  date?: string | null;
  dateLabel?: string;
  totalIncome: number;
  hiddenAllocationsTotal?: number;
}

interface MobileHorizonPaydayColumnHeaderProps {
  readonly col: MobileMatrixColumnData;
  readonly isConfirmed: boolean;
  readonly isSaved: boolean;
  readonly isSaving?: boolean;
  readonly onReview: (colId: string) => void;
  readonly onSave: (colId: string, totalIncome: number) => void;
  readonly onReset?: (colId: string) => void;
  readonly onDelete: (colId: string) => void;
  readonly onEditIncome?: (colId: string) => void;
  /** Card layout: fill the parent instead of the fixed 140dp grid column width. */
  readonly fullWidth?: boolean;
}

export const MobileHorizonPaydayColumnHeader: React.FC<MobileHorizonPaydayColumnHeaderProps> = ({
  col,
  isConfirmed,
  isSaved,
  isSaving,
  onReview,
  onSave,
  onReset,
  onDelete,
  onEditIncome,
  fullWidth,
}) => {
  const dateStr = col.date ? formatDate(col.date) : col.dateLabel || '';

  return (
    <View
      style={[
        styles.columnHeader,
        isConfirmed && styles.confirmedCol,
        isSaved && styles.savedCol,
        fullWidth && styles.fullWidthCol,
      ]}
    >
      {/* Row 1: Status Badge on its own row */}
      {isConfirmed ? (
        <View style={styles.confirmedBadge}>
          <Text style={styles.confirmedBadgeText}>{t('paydaySchedule.confirmedBadge')}</Text>
        </View>
      ) : isSaved ? (
        <View style={styles.savedBadge}>
          <Text style={styles.savedBadgeText}>{t('paydaySchedule.savedBadge')}</Text>
        </View>
      ) : (
        <View style={styles.autoBadge}>
          <Text style={styles.autoBadgeText}>{t('paydaySchedule.autoBadge')}</Text>
        </View>
      )}

      {/* Row 2: Source Name */}
      {!isConfirmed && onEditIncome ? (
        <TouchableOpacity
          onPress={() => onEditIncome(col.id)}
          activeOpacity={0.7}
          style={styles.sourceNameButton}
        >
          <Text style={styles.sourceNameLink} numberOfLines={1}>
            {col.sourceName || t('common.income')}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.sourceName} numberOfLines={1}>
          {col.sourceName || t('common.income')}
        </Text>
      )}

      {/* Row 3: Date */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, flexWrap: 'wrap' }}>
        <Text style={styles.dateText}>{dateStr}</Text>
        {!isConfirmed &&
          col.date &&
          col.date < new Date().toISOString().slice(0, 10) && (
            <View style={{ backgroundColor: DESIGN_TOKENS.colors.criticalLight, borderColor: DESIGN_TOKENS.colors.criticalBorder, borderWidth: 1, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: DESIGN_TOKENS.colors.burnRed, textTransform: 'uppercase' }}>
                {t('expenseStatus.overdueLabel')}
              </Text>
            </View>
          )}
      </View>

      {/* Row 4: Total Income */}
      <Text style={styles.incomeAmount}>+{formatMobileCurrency(col.totalIncome)}</Text>

      {/* Row 5: Primary action is a full-width button so the plan studio is easy to find */}
      <TouchableOpacity
        onPress={() => onReview(col.id)}
        style={[styles.primaryBtn, isConfirmed && styles.primaryBtnConfirmed]}
        activeOpacity={0.8}
      >
        <Text style={[styles.primaryBtnText, isConfirmed && styles.primaryBtnTextConfirmed]}>
          {isConfirmed ? t('paydaySchedule.review') : t('paydaySchedule.plan')}
        </Text>
      </TouchableOpacity>

      {!isConfirmed && (
        <View style={styles.actionRow}>
          {!isSaved && (
            <TouchableOpacity
              onPress={() => onSave(col.id, col.totalIncome)}
              disabled={isSaving}
              style={styles.secondaryBtn}
            >
              <Text style={styles.saveText}>{isSaving ? '…' : t('common.save')}</Text>
            </TouchableOpacity>
          )}
          {isSaved && onReset && (
            <TouchableOpacity onPress={() => onReset(col.id)} style={styles.secondaryBtn}>
              <Text style={styles.resetText}>{t('common.reset')}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => onDelete(col.id)} style={styles.secondaryBtn}>
            <Text style={styles.deleteText}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {col.hiddenAllocationsTotal !== undefined && col.hiddenAllocationsTotal > 0 && (
        <Text style={styles.privateFootnote}>
          ({formatMobileCurrency(col.hiddenAllocationsTotal)} {t('common.private')})
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  columnHeader: {
    width: 140,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: DESIGN_TOKENS.colors.slate[200],
    backgroundColor: DESIGN_TOKENS.colors.slate[50],
    gap: 3,
  },
  fullWidthCol: {
    width: '100%',
    borderRightWidth: 0,
    borderRadius: DESIGN_TOKENS.radius.lg,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    paddingVertical: 14,
  },
  confirmedCol: {
    backgroundColor: DESIGN_TOKENS.colors.successLight,
  },
  savedCol: {
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  sourceName: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.primary,
    textAlign: 'center',
  },
  sourceNameButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  sourceNameLink: {
    fontSize: 12,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.sereneBlue,
    textAlign: 'center',
  },
  dateText: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.textMuted,
    textAlign: 'center',
  },
  incomeAmount: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'monospace',
    color: DESIGN_TOKENS.colors.successDark,
    textAlign: 'center',
    marginTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    marginTop: 2,
    flexWrap: 'wrap',
  },
  confirmedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.successBorder,
  },
  confirmedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.successDark,
  },
  savedBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  savedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[800],
  },
  autoBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: DESIGN_TOKENS.colors.slate[200],
  },
  autoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.slate[700],
  },
  primaryBtn: {
    alignSelf: 'stretch',
    minHeight: 40,
    marginTop: 6,
    borderRadius: DESIGN_TOKENS.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  primaryBtnConfirmed: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.successBorder,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  primaryBtnTextConfirmed: {
    color: DESIGN_TOKENS.colors.successDark,
  },
  secondaryBtn: {
    minHeight: 36,
    minWidth: 56,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  saveText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.slate[600],
  },
  deleteText: {
    fontSize: 12,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.burnRed,
  },
  privateFootnote: {
    fontSize: 11,
    color: DESIGN_TOKENS.colors.slate[400],
    marginTop: 2,
  },
});
