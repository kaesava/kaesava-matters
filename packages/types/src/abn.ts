import { z } from "zod";

const ATO_ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19] as const;

export function normalizeAbnDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidAustralianAbn(value: string): boolean {
  const digits = normalizeAbnDigits(value);
  if (!/^\d{11}$/.test(digits)) {
    return false;
  }

  let weightedSum = 0;
  for (let i = 0; i < ATO_ABN_WEIGHTS.length; i++) {
    const rawDigit = Number(digits[i]);
    const adjusted = i === 0 ? rawDigit - 1 : rawDigit;
    weightedSum += adjusted * ATO_ABN_WEIGHTS[i];
  }

  return weightedSum % 89 === 0;
}

export function formatAbnDisplay(value: string): string {
  const digits = normalizeAbnDigits(value);
  if (digits.length !== 11) {
    return value.trim();
  }
  return `${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 11)}`;
}

export const AustralianAbnSchema = z
  .string()
  .trim()
  .transform(normalizeAbnDigits)
  .refine(isValidAustralianAbn, {
    message: "Invalid Australian Business Number (ABN)",
  });
