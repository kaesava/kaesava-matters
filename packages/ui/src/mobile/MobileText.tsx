import React from 'react';
import { Text, StyleSheet, type TextProps } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';

export type MobileTextVariant = 'title' | 'heading' | 'body' | 'label' | 'caption' | 'amount';

export interface MobileTextProps extends TextProps {
  variant?: MobileTextVariant;
  muted?: boolean;
}

const D = DESIGN_TOKENS;

// Type scale floor is 12sp; scaling is capped so large system fonts do not break rows.
const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: '800', color: D.colors.textPrimary },
  heading: { fontSize: 16, fontWeight: '700', color: D.colors.textPrimary },
  body: { fontSize: 15, fontWeight: '400', color: D.colors.textPrimary },
  label: { fontSize: 13, fontWeight: '600', color: D.colors.textPrimary },
  caption: { fontSize: 12, fontWeight: '500', color: D.colors.textMuted },
  amount: { fontSize: 15, fontWeight: '700', color: D.colors.textPrimary, fontVariant: ['tabular-nums'] },
  muted: { color: D.colors.textMuted },
});

export function MobileText({ variant = 'body', muted, style, ...props }: MobileTextProps) {
  return (
    <Text
      maxFontSizeMultiplier={1.3}
      style={[styles[variant], muted && styles.muted, style]}
      {...props}
    />
  );
}

export default MobileText;
