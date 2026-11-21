import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  TextInputProps,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DESIGN_TOKENS } from '../tokens';
import { PLATFORM_STYLE, getRipple } from './platform-style';
import { FormLabel } from './FormLabel';
import { FormFieldError } from './FormFieldError';

export interface InputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  containerStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  showClear?: boolean;
  compact?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      required,
      error,
      hint,
      containerStyle,
      labelStyle,
      style,
      showClear = false,
      compact = false,
      value,
      onChangeText,
      onFocus,
      onBlur,
      editable = true,
      ...props
    },
    ref
  ) => {
    const [focused, setFocused] = useState(false);
    const canClear = showClear && editable !== false && Boolean(value) && Boolean(onChangeText);

    return (
      <View style={[styles.container, compact && styles.containerCompact, containerStyle]}>
        {label && (
          <FormLabel required={required} style={labelStyle}>
            {label}
          </FormLabel>
        )}
        {hint && <Text style={styles.hint}>{hint}</Text>}
        <View
          style={[
            styles.inputWrap,
            compact && styles.inputWrapCompact,
            focused && styles.inputFocused,
            error ? styles.inputError : null,
            editable === false && styles.inputDisabled,
          ]}
        >
          <TextInput
            ref={ref}
            value={value}
            onChangeText={onChangeText}
            editable={editable}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            style={[styles.input, style]}
            placeholderTextColor={DESIGN_TOKENS.colors.textMuted}
            {...props}
          />
          {canClear && (
            <Pressable
              onPress={() => onChangeText?.('')}
              android_ripple={getRipple()}
              style={styles.clearBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Clear"
            >
              <Feather name="x-circle" size={16} color={DESIGN_TOKENS.colors.textMuted} />
            </Pressable>
          )}
        </View>
        <FormFieldError error={error} />
      </View>
    );
  }
);

Input.displayName = 'Input';

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 12,
  },
  containerCompact: {
    width: 'auto',
    marginBottom: 0,
  },
  hint: {
    fontSize: 12,
    color: D.colors.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.border,
    borderRadius: D.radius.md,
    minHeight: PLATFORM_STYLE.fieldHeight,
    paddingHorizontal: 14,
  },
  inputWrapCompact: {
    minHeight: 40,
    paddingHorizontal: 10,
    borderRadius: D.radius.default,
  },
  inputFocused: {
    borderColor: D.colors.accent,
    borderWidth: 1.5,
  },
  inputError: {
    borderColor: D.colors.critical,
  },
  inputDisabled: {
    backgroundColor: D.colors.slate[50],
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: D.colors.textPrimary,
  },
  clearBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -12,
  },
});

export default Input;
