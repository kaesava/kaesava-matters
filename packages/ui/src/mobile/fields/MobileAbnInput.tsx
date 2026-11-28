import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { isValidAustralianAbn, normalizeAbnDigits } from "@kaesava/types/platform";
import { Input } from "../Input";

export interface MobileAbnInputProps {
  value: string;
  onChangeText: (digits: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  editable?: boolean;
  compact?: boolean;
}

function formatAbnPartial(digits: string): string {
  const clean = digits.slice(0, 11);
  const parts = [clean.slice(0, 2), clean.slice(2, 5), clean.slice(5, 8), clean.slice(8, 11)];
  return parts.filter(Boolean).join(" ");
}

export function MobileAbnInput({
  value,
  onChangeText,
  label,
  error,
  hint,
  placeholder,
  required,
  editable = true,
  compact = false,
}: MobileAbnInputProps) {
  const [touched, setTouched] = useState(false);
  const normalized = normalizeAbnDigits(value).slice(0, 11);
  const displayValue = formatAbnPartial(normalized);

  const validationError =
    error ??
    (touched && normalized.length > 0 && !isValidAustralianAbn(normalized)
      ? t("forms.abnInvalid")
      : undefined);

  const handleChangeText = (text: string) => {
    const digits = normalizeAbnDigits(text).slice(0, 11);
    onChangeText(digits);
  };

  return (
    <Input
      label={label}
      required={required}
      hint={hint}
      error={validationError}
      value={displayValue}
      onChangeText={handleChangeText}
      onBlur={() => setTouched(true)}
      placeholder={placeholder ?? t("forms.abnPlaceholder")}
      keyboardType="number-pad"
      maxLength={14}
      editable={editable}
      compact={compact}
      showClear={editable}
    />
  );
}

export default MobileAbnInput;
