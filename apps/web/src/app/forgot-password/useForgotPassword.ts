import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import {
  isValidEmail,
  mapOtpResetErrorKey,
  mapOtpSendErrorKey,
  OTP_MAX_RESEND_ATTEMPTS,
  OTP_RESEND_COOLDOWN_SECONDS,
  ResetPasswordInputSchema,
  type AuthErrorLike,
} from "@money-matters/types";
import { authClient } from "../../lib/auth";

export interface ForgotPasswordFieldErrors {
  otp?: string;
  password?: string;
  confirmPassword?: string;
}

export function useForgotPassword() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<ForgotPasswordFieldErrors>({});

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((prev) => Math.max(0, prev - 1)), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    setError(null);
    setIsRequestingCode(true);
    try {
      const res = await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      const errKey = mapOtpSendErrorKey(res?.error as AuthErrorLike | null);
      if (errKey) {
        setError(t(errKey));
        return;
      }
      setResendCount(0);
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setStep("reset");
    } catch {
      setError(t("auth.forgotPasswordSendFailed"));
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleResendCode = async () => {
    if (isResending || resendCooldown > 0 || resendCount >= OTP_MAX_RESEND_ATTEMPTS) return;
    setIsResending(true);
    setError(null);
    setResendSuccess(false);
    try {
      const res = await authClient.emailOtp.requestPasswordReset({
        email: email.trim().toLowerCase(),
      });
      const errKey = mapOtpSendErrorKey(res?.error as AuthErrorLike | null);
      if (errKey) {
        setError(t(errKey));
        return;
      }
      setResendCount((prev) => prev + 1);
      setResendCooldown(OTP_RESEND_COOLDOWN_SECONDS);
      setResendSuccess(true);
    } catch {
      setError(t("auth.forgotPasswordSendFailed"));
    } finally {
      setIsResending(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    const validation = ResetPasswordInputSchema.safeParse({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
      password,
      confirmPassword,
    });
    if (!validation.success) {
      const formatted = validation.error.format();
      setFieldErrors({
        otp: formatted.otp?._errors[0] ? t("auth.invalidOtp") : undefined,
        password: formatted.password?._errors[0] ? t("auth.passwordTooShort") : undefined,
        confirmPassword: formatted.confirmPassword?._errors[0]
          ? formatted.confirmPassword._errors[0] === "passwordsMustMatch"
            ? t("auth.passwordsMustMatch")
            : t("auth.passwordTooShort")
          : undefined,
      });
      return;
    }
    setIsResetting(true);
    try {
      const res = await authClient.emailOtp.resetPassword({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
        password,
      });
      if (res.error) {
        setError(t(mapOtpResetErrorKey(res.error as AuthErrorLike)));
        return;
      }
      setStep("success");
      setTimeout(() => router.push("/sign-in"), 3000);
    } catch {
      setError(t("auth.invalidOtp"));
    } finally {
      setIsResetting(false);
    }
  };

  return {
    step, setStep, email, setEmail, otp, setOtp, password, setPassword,
    confirmPassword, setConfirmPassword, isRequestingCode, isResetting,
    isResending, resendSuccess, resendCooldown, resendCount, error, setError,
    fieldErrors, setFieldErrors, handleRequestCode, handleResendCode, handleResetPassword,
    resendLimitReached: resendCount >= OTP_MAX_RESEND_ATTEMPTS,
    isResetValid: otp.length === 6 && password.length >= 8 && confirmPassword.length >= 8 && password === confirmPassword,
  };
}
