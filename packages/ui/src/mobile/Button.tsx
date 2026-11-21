import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  PressableProps,
  StyleProp,
  TextStyle,
  ViewStyle,
  ActivityIndicator,
} from 'react-native';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE, getRipple } from './platform-style';

export interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  title?: string;
  label?: string;
  children?: React.ReactNode;
  loading?: boolean;
  /** Retained for backwards compatibility with TouchableOpacity callers. */
  activeOpacity?: number;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  title,
  label,
  children,
  style,
  textStyle,
  disabled,
  loading,
  activeOpacity: _activeOpacity,
  ...props
}) => {
  const D = DESIGN_TOKENS;

  let btnStyle: StyleProp<ViewStyle> = styles.primaryButton;
  let txtStyle: StyleProp<TextStyle> = styles.primaryText;
  let spinnerColor = '#ffffff';

  if (variant === 'secondary') {
    btnStyle = styles.secondaryButton;
    txtStyle = styles.secondaryText;
    spinnerColor = D.colors.primary;
  } else if (variant === 'danger') {
    btnStyle = styles.dangerButton;
    txtStyle = styles.dangerText;
    spinnerColor = '#ffffff';
  } else if (variant === 'ghost') {
    btnStyle = styles.ghostButton;
    txtStyle = styles.ghostText;
    spinnerColor = D.colors.primary;
  }

  let sizeStyle = styles.sizeMd;
  if (size === 'sm') sizeStyle = styles.sizeSm;
  else if (size === 'lg') sizeStyle = styles.sizeLg;

  const isTextNode =
    typeof children === 'string' ||
    typeof children === 'number' ||
    (Array.isArray(children) &&
      children.length > 0 &&
      children.every(
        (c) => typeof c === 'string' || typeof c === 'number' || c === null || c === undefined
      ));

  const ripple = getRipple(
    variant === 'primary' || variant === 'danger' ? 'rgba(255, 255, 255, 0.22)' : undefined
  );

  return (
    <Pressable
      android_ripple={ripple}
      style={({ pressed }) => [
        styles.button,
        btnStyle,
        sizeStyle,
        (disabled || loading) && styles.disabled,
        !ripple && pressed && styles.pressed,
        style,
      ]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} size="small" />
      ) : isTextNode ? (
        <Text style={[styles.baseText, txtStyle, textStyle]}>
          {children}
        </Text>
      ) : children ? (
        children
      ) : (
        <Text style={[styles.baseText, txtStyle, textStyle]}>
          {label ?? title}
        </Text>
      )}
    </Pressable>
  );
};

const D = DESIGN_TOKENS;

const styles = StyleSheet.create({
  button: {
    borderRadius: D.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.75,
  },
  sizeSm: {
    minHeight: PLATFORM_STYLE.minTouch,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  sizeMd: {
    minHeight: PLATFORM_STYLE.minTouch + 4,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  sizeLg: {
    minHeight: PLATFORM_STYLE.fieldHeight + 4,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  primaryButton: {
    backgroundColor: D.colors.sereneBlue,
  },
  secondaryButton: {
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.border,
  },
  dangerButton: {
    backgroundColor: D.colors.burnRed,
  },
  ghostButton: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  baseText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryText: {
    color: '#ffffff',
    fontSize: 15,
  },
  secondaryText: {
    color: D.colors.textPrimary,
    fontSize: 15,
  },
  dangerText: {
    color: '#ffffff',
    fontSize: 15,
  },
  ghostText: {
    color: D.colors.textMuted,
    fontSize: 14,
  },
});

export default Button;
