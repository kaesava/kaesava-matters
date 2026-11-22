import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { t } from '@kaesava/i18n';
import { DESIGN_TOKENS } from '../../tokens';
import { PLATFORM_STYLE, getRipple } from '../platform-style';
import FormLabel from '../FormLabel';
import FormFieldError from '../FormFieldError';
import MobileModalDialog from '../MobileModalDialog';
import MobileButton from '../Button';
import { useDateLocale } from '../../hooks/DateLocaleContext';

export interface DatePickerFieldProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (isoDate: string) => void;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  compact?: boolean;
  minDate?: string;
  maxDate?: string;
  locale?: string;
  timeZone?: string;
}

interface NativeDateTimePickerProps {
  value: Date;
  mode: 'date';
  display?: 'default' | 'spinner' | 'calendar' | 'inline';
  minimumDate?: Date;
  maximumDate?: Date;
  onChange: (event: { type: string }, selectedDate?: Date) => void;
}

function loadNativeDateTimePicker(): React.ComponentType<NativeDateTimePickerProps> | null {
  try {
    // Lazy-loaded so Web/Node test bundles never evaluate native RN DateTimePicker.
    const mod = require('@react-native-community/datetimepicker') as {
      default?: React.ComponentType<NativeDateTimePickerProps>;
    };
    return mod?.default ?? null;
  } catch {
    return null;
  }
}

function parseIsoDate(iso?: string): Date {
  if (iso) {
    const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
    if (y && m && d) return new Date(y, m - 1, d);
  }
  return new Date();
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(isoDate?: string, locale?: string, compact = false): string {
  if (!isoDate) return t('common.selectDate');
  const dateObj = parseIsoDate(isoDate);
  const resolvedLocale = !locale || locale === 'auto' ? undefined : locale;
  return dateObj.toLocaleDateString(resolvedLocale, compact
    ? { day: 'numeric', month: 'short', year: 'numeric' }
    : { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function DatePickerField({
  label,
  value,
  onChange,
  required = false,
  error,
  disabled = false,
  compact = false,
  minDate,
  maxDate,
  locale: propLocale,
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => parseIsoDate(value));
  const dateLocaleCtx = useDateLocale();
  const effectiveLocale = propLocale || dateLocaleCtx.locale;
  const NativePicker = loadNativeDateTimePicker();

  const handleOpen = () => {
    if (disabled) return;
    setDraftDate(parseIsoDate(value));
    setOpen(true);
  };

  const minDateObj = minDate ? parseIsoDate(minDate) : undefined;
  const maxDateObj = maxDate ? parseIsoDate(maxDate) : undefined;

  return (
    <View style={styles.container}>
      {label ? <FormLabel required={required}>{label}</FormLabel> : null}

      <Pressable
        onPress={handleOpen}
        disabled={disabled}
        android_ripple={getRipple()}
        accessibilityRole="button"
        accessibilityLabel={label || t('common.selectDate')}
        style={[
          styles.fieldCard,
          compact && styles.fieldCardCompact,
          error ? styles.fieldCardError : null,
          disabled && styles.fieldCardDisabled,
        ]}
      >
        <View style={[styles.iconBox, compact && styles.iconBoxCompact]}>
          <Feather name="calendar" size={compact ? 14 : 18} color={DESIGN_TOKENS.colors.accent} />
        </View>

        <Text
          numberOfLines={1}
          style={[
            styles.dateText,
            compact && styles.dateTextCompact,
            !value && styles.datePlaceholder,
            disabled && styles.textDisabled,
          ]}
        >
          {formatDisplayDate(value, effectiveLocale, compact)}
        </Text>

        <Feather name="chevron-down" size={compact ? 14 : 18} color={DESIGN_TOKENS.colors.subtleText} />
      </Pressable>

      <FormFieldError error={error} />

      {open && NativePicker && PLATFORM_STYLE.isAndroid && (
        <NativePicker
          value={draftDate}
          mode="date"
          display="default"
          minimumDate={minDateObj}
          maximumDate={maxDateObj}
          onChange={(event, selectedDate) => {
            setOpen(false);
            if (event.type === 'set' && selectedDate) {
              onChange(toIsoDate(selectedDate));
            }
          }}
        />
      )}

      {open && NativePicker && !PLATFORM_STYLE.isAndroid && (
        <MobileModalDialog
          visible={open}
          onClose={() => setOpen(false)}
          title={label || t('common.selectDate')}
          footer={
            <MobileButton
              variant="primary"
              title={t('common.done')}
              onPress={() => {
                onChange(toIsoDate(draftDate));
                setOpen(false);
              }}
            />
          }
        >
          <NativePicker
            value={draftDate}
            mode="date"
            display="spinner"
            minimumDate={minDateObj}
            maximumDate={maxDateObj}
            onChange={(_event, selectedDate) => {
              if (selectedDate) setDraftDate(selectedDate);
            }}
          />
        </MobileModalDialog>
      )}
    </View>
  );
}

const D = DESIGN_TOKENS;
const styles = StyleSheet.create({
  container: { marginBottom: 12 },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: PLATFORM_STYLE.fieldHeight,
    paddingHorizontal: 12,
    backgroundColor: D.colors.surface,
    borderWidth: 1,
    borderColor: D.colors.cardBorder,
    borderRadius: D.radius.md,
    overflow: 'hidden',
  },
  fieldCardCompact: {
    minHeight: PLATFORM_STYLE.minTouch,
    paddingHorizontal: 10,
    borderRadius: D.radius.default,
  },
  fieldCardError: { borderColor: D.colors.critical },
  fieldCardDisabled: { backgroundColor: D.colors.slate[50], borderColor: D.colors.cardBorder },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: D.colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconBoxCompact: { width: 24, height: 24, borderRadius: 6, marginRight: 6 },
  dateText: { flex: 1, fontSize: 15, fontWeight: '600', color: D.colors.textPrimary },
  dateTextCompact: { fontSize: 13, fontWeight: '500' },
  datePlaceholder: { color: D.colors.subtleText, fontWeight: '400' },
  textDisabled: { color: D.colors.subtleText },
});

export default DatePickerField;
