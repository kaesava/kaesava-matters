import { z } from "zod";

export const SignInInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    password: z.string().min(1, "fillAllFields"),
  })
  .strict();

export const SignUpInputSchema = z
  .object({
    name: z.string().trim().min(1, "fillAllFields"),
    country: z.string().length(2, "fillAllFields"),
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string().min(8, "passwordTooShort"),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: "mustAgreeToTerms" }),
    }),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  });

export const CheckEmailAuthProviderInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
  })
  .strict();

export interface CheckEmailAuthProviderResult {
  isGoogleOnly: boolean;
}

export const ResetPasswordInputSchema = z
  .object({
    email: z.string().trim().min(1, "fillAllFields").email("invalidEmail"),
    otp: z.string().trim().regex(/^\d{6}$/, "invalidOtp"),
    password: z.string().min(8, "passwordTooShort"),
    confirmPassword: z.string().min(8, "passwordTooShort"),
  })
  .strict()
  .refine((data) => data.password === data.confirmPassword, {
    message: "passwordsMustMatch",
    path: ["confirmPassword"],
  });

export const CompleteProfileInputSchema = z
  .object({
    name: z.string().trim().min(2, "fillAllFields"),
    country: z.string().length(2, "fillAllFields"),
    agreedToTerms: z.literal(true, {
      errorMap: () => ({ message: "mustAgreeToTerms" }),
    }),
  })
  .strict();

export type CompleteProfileInput = z.infer<typeof CompleteProfileInputSchema>;

interface PasswordStrengthResult {
  score: number;
  hasMinLength: boolean;
  hasLower: boolean;
  hasUpper: boolean;
  hasNumberOrSpecial: boolean;
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const hasMinLength = password.length >= 8;
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumberOrSpecial = /[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const score = [hasMinLength, hasLower, hasUpper, hasNumberOrSpecial].filter(Boolean).length;

  return {
    score,
    hasMinLength,
    hasLower,
    hasUpper,
    hasNumberOrSpecial,
  };
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(email: string): boolean {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
}

export const OTP_RESEND_COOLDOWN_SECONDS = 60;
export const OTP_MAX_RESEND_ATTEMPTS = 3;

export interface AuthErrorLike {
  status?: number;
  code?: string;
  message?: string;
}

export function mapOtpSendErrorKey(error: AuthErrorLike | null | undefined): string | null {
  if (!error) return null;
  if (error.status === 429) return "auth.tooManyRequests";
  return "auth.forgotPasswordSendFailed";
}

export function mapOtpResetErrorKey(error: AuthErrorLike | null | undefined): string {
  if (!error) return "auth.invalidOtp";
  if (error.status === 429) return "auth.tooManyRequests";
  if (error.status === 403 || error.code === "TOO_MANY_ATTEMPTS") {
    return "auth.tooManyOtpAttempts";
  }
  if (error.code === "OTP_EXPIRED") return "auth.otpExpired";
  return "auth.invalidOtp";
}
