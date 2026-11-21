import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';

export interface MobileDetailLinkRowProps {
  label: string;
  value: string;
  /** When provided the whole row is a button with a trailing chevron; otherwise it is a read-only row. */
  onPress?: () => void;
}

// Mobile-native replacement for inline links in detail sheets: whole row is the target, chevron signals navigation.
export function MobileDetailLinkRow({ label, value, onPress }: MobileDetailLinkRowProps) {
  const content = (
    <>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.value, onPress && styles.valueLink]} numberOfLines={2}>
          {value}
        </Text>
        {onPress ? <Feather name="chevron-right" size={18} color={DESIGN_TOKENS.colors.accent} /> : null}
      </View>
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: { fontSize: 12, fontWeight: '600', color: DESIGN_TOKENS.colors.textMuted },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 },
  value: { fontSize: 13, fontWeight: '700', color: DESIGN_TOKENS.colors.primary, textAlign: 'right', flexShrink: 1 },
  valueLink: { color: DESIGN_TOKENS.colors.accent, fontWeight: '800' },
});

export default MobileDetailLinkRow;
