"use client";

import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import {
  Button,
  FormLabel,
  FormFieldError,
  FormErrorBanner,
  OtpInput,
  Spinner,
} from "@kaesava/ui/web";
import { isValidEmail } from "@kaesava/types";
import { PublicHeader } from "../../components/public/PublicHeader";
import { PublicFooter } from "../../components/public/PublicFooter";
import { PasswordStrengthIndicator } from "@kaesava/capability-auth/web";
import { useForgotPassword } from "./useForgotPassword";

export default function ForgotPasswordPage() {
  const {
    step,
    setStep,
    email,
    setEmail,
    otp,
    setOtp,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    isRequestingCode,
    isResetting,
    isResending,
    resendSuccess,
    resendCooldown,
    resendLimitReached,
    error,
    setError,
    fieldErrors,
    setFieldErrors,
    handleRequestCode,
    handleResendCode,
    handleResetPassword,
    isResetValid,
  } = useForgotPassword();

  return (
    <div className="min-h-screen bg-[#F7F8FA] flex flex-col font-sans justify-between">
      <PublicHeader backHref="/sign-in" backLabel={t("auth.backToSignIn")} />

      <main className="flex-1 flex items-center justify-center p-6 my-8">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 sm:p-10">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-extrabold text-[#1B2B4B] tracking-tight">
              {step === "reset" ? t("auth.setNewPasswordTitle") : t("auth.forgotPasswordTitle")}
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              {step === "reset"
                ? t("auth.setNewPasswordSubtitle")
                : t("auth.forgotPasswordSubtitle")}
            </p>
          </div>

          {step === "success" && (
            <div className="text-center flex flex-col items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                ✓
              </div>
              <h2 className="text-base font-bold text-[#1B2B4B]">
                {t("auth.passwordResetSuccessTitle")}
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t("auth.passwordResetSuccessDesc")}
              </p>
              <Link
                href="/sign-in"
                className="mt-2 inline-flex items-center justify-center px-5 py-2.5 text-xs font-bold text-white bg-[#2563eb] rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
              >
                {t("auth.backToSignIn")}
              </Link>
            </div>
          )}

          {step === "email" && (
            <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
              <FormErrorBanner message={error} />

              <div>
                <FormLabel htmlFor="email-input" required={true}>
                  {t("auth.emailLabel")}
                </FormLabel>
                <input
                  id="email-input"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("auth.emailPlaceholder")}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
                />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs cursor-pointer"
                loading={isRequestingCode}
                disabled={!isValidEmail(email) || isRequestingCode}
              >
                {t("auth.sendResetCode")}
              </Button>

              <div className="text-center mt-2">
                <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </form>
          )}

          {step === "reset" && (
            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <FormErrorBanner message={error} />

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="truncate mr-2">
                  <span className="text-[11px] text-slate-500 block font-medium">
                    {t("auth.codeSentTo")}
                  </span>
                  <span className="text-xs font-bold text-slate-800 truncate block">
                    {email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setError(null);
                  }}
                  className="text-xs text-[#2563eb] hover:underline font-semibold shrink-0 cursor-pointer"
                >
                  {t("auth.editEmail")}
                </button>
              </div>

              {resendSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl text-center">
                  ✓ {t("auth.resendSuccess")}
                </div>
              )}

              <div>
                <OtpInput
                  id="otp-input"
                  label={t("auth.otpLabel")}
                  required={true}
                  autoFocus={true}
                  value={otp}
                  onChange={(val) => {
                    setOtp(val);
                    if (fieldErrors.otp) setFieldErrors((prev) => ({ ...prev, otp: undefined }));
                  }}
                  placeholder={t("auth.otpPlaceholder")}
                  error={fieldErrors.otp}
                />
                <div className="flex items-center justify-between gap-2 mt-1.5">
                  <p className="text-[11px] text-slate-500">
                    {t("auth.otpExpiryNotice")}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={isResending || resendCooldown > 0 || resendLimitReached}
                    className="text-xs text-[#2563eb] hover:underline font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1 shrink-0"
                  >
                    {isResending && <Spinner size="sm" />}
                    <span>
                      {resendCooldown > 0
                        ? t("auth.resendCodeIn", { seconds: resendCooldown })
                        : t("auth.resendCode")}
                    </span>
                  </button>
                </div>
                {resendLimitReached && (
                  <p className="text-[11px] text-amber-600 mt-1 font-medium">
                    {t("auth.resendLimitReached")}
                  </p>
                )}
              </div>

              <div>
                <FormLabel htmlFor="new-password-input" required={true}>
                  {t("auth.newPasswordLabel")}
                </FormLabel>
                <input
                  id="new-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                    fieldErrors.password ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:ring-[#2563eb]"
                  } focus:outline-none focus:ring-2`}
                />
                <FormFieldError error={fieldErrors.password} />
                {password && <PasswordStrengthIndicator password={password} />}
              </div>

              <div>
                <FormLabel htmlFor="confirm-password-input" required={true}>
                  {t("auth.confirmPasswordLabel")}
                </FormLabel>
                <input
                  id="confirm-password-input"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                    fieldErrors.confirmPassword ? "border-rose-400 focus:ring-rose-500" : "border-slate-200 focus:ring-[#2563eb]"
                  } focus:outline-none focus:ring-2`}
                />
                <FormFieldError error={fieldErrors.confirmPassword} />
              </div>

              <Button
                type="submit"
                className="w-full mt-2 bg-[#2563eb] hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-xs cursor-pointer"
                loading={isResetting}
                disabled={!isResetValid || isResetting}
              >
                {t("auth.resetPasswordButton")}
              </Button>

              <div className="text-center mt-2">
                <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline font-semibold">
                  {t("auth.backToSignIn")}
                </Link>
              </div>
            </form>
          )}
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
