import { View, Text, Switch, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';
import { InfoTooltip } from './InfoTooltip';

export interface SwitchRowProps {
  label: string;
  hint?: string;
  infoTooltip?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  noBorder?: boolean;
}

export function SwitchRow({
  label,
  hint,
  infoTooltip,
  value,
  onValueChange,
  disabled = false,
  noBorder = false,
}: SwitchRowProps) {
  return (
    <View style={[styles.row, noBorder && styles.rowNoBorder]}>
      <View style={styles.textContainer}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {infoTooltip ? <InfoTooltip content={infoTooltip} /> : null}
        </View>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: DESIGN_TOKENS.colors.slate[200],
          true: DESIGN_TOKENS.colors.accent,
        }}
        thumbColor={DESIGN_TOKENS.colors.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: PLATFORM_STYLE.minTouch,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: DESIGN_TOKENS.colors.border,
  },
  rowNoBorder: {
    borderBottomWidth: 0,
  },
  textContainer: {
    flex: 1,
    paddingRight: 16,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: DESIGN_TOKENS.colors.textPrimary,
    flexShrink: 1,
  },
  hint: {
    fontSize: 12,
    color: DESIGN_TOKENS.colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
});
