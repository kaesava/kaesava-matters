import {
  TouchableOpacity,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE } from './platform-style';

export interface EntityLinkChipProps {
  label: string;
  onPress: () => void;
  isPrivate?: boolean | null;
  icon?: 'folder' | 'credit-card' | 'none';
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function EntityLinkChip({
  label,
  onPress,
  isPrivate = false,
  icon = 'none',
  style,
  testID,
}: EntityLinkChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
            style={[styles.chip, style]}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {isPrivate && (
        <Feather name="lock" size={12} color={DESIGN_TOKENS.colors.textMuted} style={styles.lockIcon} />
      )}
      {icon === 'folder' && (
        <Feather name="folder" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
      )}
      {icon === 'credit-card' && (
        <Feather name="credit-card" size={14} color={DESIGN_TOKENS.colors.sereneBlue} />
      )}
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Feather name="chevron-right" size={16} color={DESIGN_TOKENS.colors.sereneBlue} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DESIGN_TOKENS.colors.accentLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
    // Why: this is a navigation target inside cards; it must meet the platform touch minimum.
    minHeight: PLATFORM_STYLE.minTouch,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  lockIcon: {
    marginRight: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: DESIGN_TOKENS.colors.sereneBlue,
    flexShrink: 1,
  },
});

export default EntityLinkChip;
