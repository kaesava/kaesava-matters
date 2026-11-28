"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, FormFieldError, FormLabel, Spinner } from "@kaesava/ui/web";
import { evaluatePasswordStrength } from "@kaesava/types";
import { PasswordStrengthIndicator } from "@kaesava/capability-auth/web";
import { authClient } from "../../lib/auth";
import "../../i18n";

function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return setError(t("auth.invalidToken"));
    if (evaluatePasswordStrength(password).score < 4) return setError(t("auth.passwordTooShort"));
    if (password !== confirmPassword) return setError(t("auth.passwordsMustMatch"));

    setIsSubmitting(true);
    try {
      const res = await authClient.resetPassword({ newPassword: password, token });
      if (res.error) throw new Error(res.error.message || t("auth.resetPasswordGenericError"));
      setIsSuccess(true);
      setTimeout(() => router.push("/sign-in"), 2500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.resetPasswordGenericError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-6 space-y-2">
        <h2 className="text-xl font-bold text-[#1B2B4B]">{t("auth.passwordResetSuccessTitle")}</h2>
        <p className="text-sm text-slate-600">{t("auth.passwordResetSuccessDesc")}</p>
      </div>
    );
  }

  const isFormValid = token.length > 0 && evaluatePasswordStrength(password).score === 4 && password === confirmPassword;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <FormErrorBanner message={error} />}
      {!token && <FormErrorBanner message={t("auth.invalidToken")} />}
      <div>
        <FormLabel required>{t("auth.newPasswordLabel")}</FormLabel>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          autoFocus
          disabled={!token || isSubmitting}
          className="w-full h-10 px-3 border rounded-lg text-sm bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        {password.length > 0 && <PasswordStrengthIndicator password={password} />}
      </div>
      <div>
        <FormLabel required>{t("auth.confirmPasswordLabel")}</FormLabel>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          disabled={!token || isSubmitting}
          className="w-full h-10 px-3 border rounded-lg text-sm bg-white border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        {confirmPassword.length > 0 && password !== confirmPassword && <FormFieldError error={t("auth.passwordsMustMatch")} />}
      </div>
      <Button type="submit" variant="primary" disabled={!isFormValid || isSubmitting} loading={isSubmitting} className="w-full mt-2">
        {t("auth.resetPasswordButton")}
      </Button>
      <div className="text-center mt-2">
        <Link href="/sign-in" className="text-xs text-[#2563eb] hover:underline">
          {t("auth.signInInstead")}
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-[#F7F8FA]">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl border border-slate-200 space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[#1B2B4B]">{t("auth.resetPassword")}</h1>
          <p className="text-sm text-slate-600 mt-1">{t("auth.resetPasswordSubtitle")}</p>
        </div>
        <Suspense fallback={<div className="flex justify-center py-8"><Spinner size="md" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
