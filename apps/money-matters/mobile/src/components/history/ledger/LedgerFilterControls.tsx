import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { SearchInput, RecordFilterBadge, DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';

export type LedgerFlowFilter = 'ALL' | 'DEBIT' | 'CREDIT' | 'TRANSFER';

export interface LedgerFilterControlsProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  flowFilter: LedgerFlowFilter;
  onFlowFilterChange: (f: LedgerFlowFilter) => void;
  activeCount: number;
  onOpenFilterSheet: () => void;
  onExportCsv: () => void;
  disableExport: boolean;
  selectedPoolId: string;
  selectedBankAccountId: string;
  matchedPoolName?: string;
  matchedBankName?: string;
  onClearPool: () => void;
  onClearBank: () => void;
  onOpenReports?: () => void;
}

export function LedgerFilterControls({
  searchQuery,
  onSearchChange,
  flowFilter,
  onFlowFilterChange,
  activeCount,
  onOpenFilterSheet,
  onExportCsv,
  disableExport,
  selectedPoolId,
  selectedBankAccountId,
  matchedPoolName,
  matchedBankName,
  onClearPool,
  onClearBank,
  onOpenReports,
}: LedgerFilterControlsProps) {
  return (
    <View style={styles.lockedHeader}>
      <View style={styles.controlsRow}>
        <View style={styles.searchWrap}>
          <SearchInput
            placeholder={t('common.searchPlaceholder')}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
        </View>

        <TouchableOpacity
          style={[styles.filterBtn, activeCount > 0 && styles.filterBtnActive]}
          onPress={onOpenFilterSheet}
          activeOpacity={0.7}
        >
          <Feather
            name="sliders"
            size={15}
            color={activeCount > 0 ? DESIGN_TOKENS.colors.sereneBlue : DESIGN_TOKENS.colors.textMuted}
          />
          <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>
            {t('common.filter')}
            {activeCount > 0 ? ` (${activeCount})` : ''}
          </Text>
        </TouchableOpacity>

        {onOpenReports && (
          <TouchableOpacity
            onPress={onOpenReports}
            style={styles.csvBtn}
            activeOpacity={0.7}
          >
            <Feather name="bar-chart-2" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onExportCsv}
          style={styles.csvBtn}
          disabled={disableExport}
          activeOpacity={0.7}
        >
          <Feather name="download" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.flowChipsRow}
      >
        {(
          [
            { key: 'ALL', label: t('common.all') },
            { key: 'DEBIT', label: t('common.expense') },
            { key: 'CREDIT', label: t('common.income') },
            { key: 'TRANSFER', label: t('common.transfer') },
          ] as const
        ).map((chip) => {
          const active = flowFilter === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => onFlowFilterChange(chip.key)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.flowChip, active && styles.flowChipActive]}
            >
              <Text style={[styles.flowChipText, active && styles.flowChipTextActive]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {(selectedPoolId !== 'ALL' || selectedBankAccountId !== 'ALL') && (
        <View style={styles.badgeRow}>
          {selectedPoolId !== 'ALL' && (
            <RecordFilterBadge
              label={
                matchedPoolName
                  ? t('history.filteredToEnvelope', { name: matchedPoolName })
                  : t('history.filterItemUnavailable')
              }
              onClear={onClearPool}
            />
          )}
          {selectedBankAccountId !== 'ALL' && (
            <RecordFilterBadge
              label={
                matchedBankName
                  ? t('history.filteredToAccount', { name: matchedBankName })
                  : t('history.filterItemUnavailable')
              }
              onClear={onClearBank}
            />
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  lockedHeader: {
    backgroundColor: DESIGN_TOKENS.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: DESIGN_TOKENS.colors.slate[100],
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchWrap: {
    flex: 1,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
    gap: 6,
  },
  filterBtnActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.sereneBlue,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  filterBtnTextActive: {
    color: DESIGN_TOKENS.colors.sereneBlue,
  },
  csvBtn: {
    padding: 10,
    backgroundColor: DESIGN_TOKENS.colors.background,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: DESIGN_TOKENS.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  flowChipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  flowChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
  },
  flowChipActive: {
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    borderColor: DESIGN_TOKENS.colors.accent,
  },
  flowChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.textMuted,
  },
  flowChipTextActive: {
    color: DESIGN_TOKENS.colors.accent,
  },
});
