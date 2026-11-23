import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { t } from '@kaesava/i18n';

export type HorizonViewMode = 'cards' | 'grid';

interface MobileHorizonViewToggleProps {
  readonly value: HorizonViewMode;
  readonly onChange: (mode: HorizonViewMode) => void;
}

const OPTIONS: ReadonlyArray<{ mode: HorizonViewMode; labelKey: 'paydaySchedule.viewCards' | 'paydaySchedule.viewGrid' }> = [
  { mode: 'cards', labelKey: 'paydaySchedule.viewCards' },
  { mode: 'grid', labelKey: 'paydaySchedule.viewGrid' },
];

export const MobileHorizonViewToggle: React.FC<MobileHorizonViewToggleProps> = ({ value, onChange }) => (
  <View style={styles.track}>
    {OPTIONS.map(({ mode, labelKey }) => (
      <TouchableOpacity
        key={mode}
        onPress={() => onChange(mode)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: value === mode }}
        style={[styles.segment, value === mode && styles.segmentActive]}
      >
        <Text style={[styles.label, value === mode && styles.labelActive]}>{t(labelKey)}</Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 3,
    borderRadius: DESIGN_TOKENS.radius.md,
    backgroundColor: DESIGN_TOKENS.colors.slate[100],
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: DESIGN_TOKENS.radius.default,
  },
  segmentActive: { backgroundColor: DESIGN_TOKENS.colors.surface },
  label: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.textMuted },
  labelActive: { color: DESIGN_TOKENS.colors.primary },
});
