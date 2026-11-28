"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import { isValidAustralianAbn, normalizeAbnDigits } from "@kaesava/types/platform";
import { FormLabel } from "../FormLabel";
import { FormFieldError } from "../FormFieldError";

export interface AbnInputProps {
  value: string;
  onChange: (digits: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  containerClassName?: string;
  id?: string;
  name?: string;
}

function formatAbnPartial(digits: string): string {
  const clean = digits.slice(0, 11);
  const parts = [clean.slice(0, 2), clean.slice(2, 5), clean.slice(5, 8), clean.slice(8, 11)];
  return parts.filter(Boolean).join(" ");
}

export function AbnInput({
  value,
  onChange,
  label,
  error,
  hint,
  placeholder,
  required,
  disabled = false,
  className = "",
  containerClassName = "",
  id,
  name,
}: AbnInputProps) {
  const generatedId = useId();
  const inputId = id || name || generatedId;
  const [touched, setTouched] = useState(false);

  const normalized = normalizeAbnDigits(value).slice(0, 11);
  const displayValue = formatAbnPartial(normalized);
  const validationError =
    error ??
    (touched && normalized.length > 0 && !isValidAustralianAbn(normalized)
      ? t("forms.abnInvalid")
      : undefined);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = normalizeAbnDigits(e.target.value).slice(0, 11);
    onChange(digits);
  };

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <FormLabel htmlFor={inputId} required={required}>
          {label}
        </FormLabel>
      )}
      {hint && <p className="text-xs text-slate-500 mb-1.5 font-medium">{hint}</p>}
      <input
        id={inputId}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={14}
        value={displayValue}
        onChange={handleChange}
        onBlur={() => setTouched(true)}
        placeholder={placeholder ?? t("forms.abnPlaceholder")}
        disabled={disabled}
        aria-invalid={Boolean(validationError)}
        className={`ui-input font-mono tabular-nums h-[46px] ${
          validationError ? "border-red-500 focus:border-red-500" : ""
        } ${className}`}
      />
      <FormFieldError error={validationError} />
    </div>
  );
}
