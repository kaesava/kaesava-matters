"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, FormErrorBanner, OtpInput } from "@kaesava/ui/web";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator.js";

export interface WebForgotPasswordCardProps {
  appName: string;
  signInHref?: string;
}

export function WebForgotPasswordCard({ appName, signInHref = "/sign-in" }: WebForgotPasswordCardProps) {
  const [step, setStep] = useState<"email" | "reset" | "success">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/email-otp/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || t("auth.forgotPasswordTitle"));
        return;
      }
      setStep("reset");
    } catch {
      setError(t("auth.forgotPasswordTitle"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/email-otp/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || t("auth.setNewPasswordTitle"));
        return;
      }
      setStep("success");
    } catch {
      setError(t("auth.setNewPasswordTitle"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 flex flex-col gap-5">
      <div className="text-center flex flex-col items-center gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563eb]">{appName}</span>
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">
          {step === "reset" ? t("auth.setNewPasswordTitle") : t("auth.forgotPasswordTitle")}
        </h1>
      </div>
      {error && <FormErrorBanner message={error} />}
      {step === "success" && (
        <div className="text-center flex flex-col items-center gap-4">
          <p className="text-sm font-semibold text-emerald-700">{t("auth.passwordResetSuccessTitle")}</p>
          <a href={signInHref} className="text-xs font-bold text-[#2563eb] hover:underline">{t("auth.backToSignIn")}</a>
        </div>
      )}
      {step === "email" && (
        <form onSubmit={handleRequest} className="flex flex-col gap-4">
          <div>
            <FormLabel htmlFor="fp-email" required>{t("auth.emailLabel")}</FormLabel>
            <input id="fp-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
          </div>
          <Button type="submit" disabled={isSubmitting || !email} className="w-full h-10">{t("auth.sendResetCode")}</Button>
          <a href={signInHref} className="text-center text-xs font-semibold text-[#2563eb] hover:underline">{t("auth.backToSignIn")}</a>
        </form>
      )}
      {step === "reset" && (
        <form onSubmit={handleReset} className="flex flex-col gap-4">
          <OtpInput value={otp} onChange={setOtp} />
          <div>
            <FormLabel htmlFor="fp-password" required>{t("auth.newPasswordLabel")}</FormLabel>
            <input id="fp-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
            <PasswordStrengthIndicator password={password} />
          </div>
          <Button type="submit" disabled={isSubmitting || otp.length < 6 || password.length < 8} className="w-full h-10">{t("auth.resetPasswordButton")}</Button>
        </form>
      )}
    </div>
  );
}
