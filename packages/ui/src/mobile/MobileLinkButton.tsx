import React from 'react';
import { Text, TouchableOpacity, StyleSheet, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';

export interface MobileLinkButtonProps {
  label: string;
  onPress: () => void;
  /** Tint for text and chevron; defaults to the accent colour. */
  color?: string;
  showChevron?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

// Replaces small underlined text links: guarantees a platform-minimum tap target and a visible affordance.
export function MobileLinkButton({
  label,
  onPress,
  color = DESIGN_TOKENS.colors.accent,
  showChevron = true,
  disabled,
  style,
  textStyle,
}: MobileLinkButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[styles.button, style]}
    >
      <Text style={[styles.text, { color }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
      {showChevron ? <Feather name="chevron-right" size={16} color={color} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 8,
  },
  text: { fontSize: 13, fontWeight: '700' },
});

export default MobileLinkButton;
