export interface PasswordStrengthResult {
  score: 0 | 1 | 2 | 3 | 4;
  level: "empty" | "weak" | "fair" | "good" | "strong";
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

/**
 * Headless password strength evaluator shared identically across Web & Mobile.
 */
export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };

  if (!password) {
    return { score: 0, level: "empty", checks };
  }

  let points = 0;
  if (checks.minLength) points += 1;
  if (checks.hasUppercase && checks.hasLowercase) points += 1;
  if (checks.hasNumber) points += 1;
  if (checks.hasSpecial || password.length >= 12) points += 1;

  const score = Math.min(4, points) as 0 | 1 | 2 | 3 | 4;
  const levelMap: Record<0 | 1 | 2 | 3 | 4, PasswordStrengthResult["level"]> = {
    0: "empty",
    1: "weak",
    2: "fair",
    3: "good",
    4: "strong",
  };

  return { score, level: levelMap[score], checks };
}
