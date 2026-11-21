import React from 'react';
import { View, Text, StyleSheet, ViewProps, StyleProp, TextStyle } from 'react-native';

export interface BankProviderBadgeProps extends ViewProps {
  provider?: string | null;
  textStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md';
}

export const BankProviderBadge: React.FC<BankProviderBadgeProps> = ({
  provider,
  size = 'sm',
  style,
  textStyle,
  ...props
}) => {
  const label = (provider || '').trim() || 'Other';

  return (
    <View
      style={[
        styles.badge,
        size === 'md' ? styles.badgeMd : styles.badgeSm,
        style,
      ]}
      {...props}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.text,
          size === 'md' ? styles.textMd : styles.textSm,
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#F8FAFC',
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 140,
  },
  badgeSm: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  badgeMd: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  text: {
    fontWeight: '700',
    color: '#334155',
  },
  textSm: {
    fontSize: 12,
    letterSpacing: 0.3,
  },
  textMd: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
});

export default BankProviderBadge;
