import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';

export interface RecordFilterBadgeProps {
  label: string;
  prefix?: string;
  onClear: () => void;
}

export const RecordFilterBadge: React.FC<RecordFilterBadgeProps> = ({
  label,
  prefix,
  onClear,
}) => {
  return (
    <View style={styles.container}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <TouchableOpacity
        onPress={onClear}
        hitSlop={{ top: 13, bottom: 13, left: 13, right: 13 }}
        style={styles.clearBtn}
        accessibilityLabel={`Clear filter for ${label}`}
        accessibilityRole="button"
      >
        <Feather name="x" size={12} color="#1D4ED8" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  prefix: {
    fontSize: 12,
    color: '#64748B',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1B2B4B',
    maxWidth: 220,
  },
  clearBtn: {
    width: 16, // mm-allow-interaction: 16dp glyph with hitSlop
    height: 16, // mm-allow-interaction: 16dp glyph with hitSlop
    borderRadius: 8,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
});
