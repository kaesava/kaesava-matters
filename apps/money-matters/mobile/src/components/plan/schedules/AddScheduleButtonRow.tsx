import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS, PLATFORM_STYLE, MobileModalDialog, MobileDetailLinkRow } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';

interface AddScheduleButtonRowProps {
  setupSubSegment: 'INCOME' | 'EXPENSE';
  onAddSchedule: (mode: 'INCOME' | 'EXPENSE') => void;
  onAddOneOff?: (mode: 'INCOME' | 'EXPENSE') => void;
}

export const AddScheduleButtonRow: React.FC<AddScheduleButtonRowProps> = ({
  setupSubSegment,
  onAddSchedule,
  onAddOneOff,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const scheduleLabel =
    setupSubSegment === 'INCOME' ? t('payday.addIncomeSchedule') : t('planTabs.addBillSchedule');
  const oneOffLabel =
    setupSubSegment === 'INCOME' ? t('planTabs.oneOffIncome') : t('planTabs.oneOffExpense');

  return (
    <View style={styles.addScheduleRow}>
      <TouchableOpacity
        style={styles.addScheduleBtn}
        onPress={() => (onAddOneOff ? setMenuOpen(true) : onAddSchedule(setupSubSegment))}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={scheduleLabel}
      >
        <Feather name="plus" size={16} color={DESIGN_TOKENS.colors.onAccent} />
        <Text style={styles.addScheduleBtnText} numberOfLines={1}>
          {onAddOneOff ? t('common.add') : scheduleLabel}
        </Text>
      </TouchableOpacity>

      {onAddOneOff && (
        <MobileModalDialog
          visible={menuOpen}
          onClose={() => setMenuOpen(false)}
          title={t('common.add')}
        >
          <View style={styles.sheetList}>
            <MobileDetailLinkRow
              label={t('common.add')}
              value={scheduleLabel}
              onPress={() => {
                setMenuOpen(false);
                onAddSchedule(setupSubSegment);
              }}
            />
            <View style={styles.divider} />
            <MobileDetailLinkRow
              label={t('common.add')}
              value={oneOffLabel}
              onPress={() => {
                setMenuOpen(false);
                onAddOneOff(setupSubSegment);
              }}
            />
          </View>
        </MobileModalDialog>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  addScheduleRow: {
    marginBottom: 14,
  },
  addScheduleBtn: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DESIGN_TOKENS.colors.accent,
    borderRadius: DESIGN_TOKENS.radius.md,
    paddingHorizontal: 16,
  },
  addScheduleBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.onAccent,
  },
  sheetList: {
    gap: 4,
  },
  divider: {
    height: 1,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
});
