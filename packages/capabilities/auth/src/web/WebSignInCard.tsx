"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, FormErrorBanner } from "@kaesava/ui/web";

export interface WebSignInCardProps {
  appName: string;
  redirectUrl?: string;
  signUpHref?: string;
  forgotPasswordHref?: string;
}

export function WebSignInCard({
  appName,
  redirectUrl = "/dashboard",
  signUpHref = "/sign-up",
  forgotPasswordHref = "/forgot-password",
}: WebSignInCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleGoogle() {
    setError(null);
    setIsSubmitting(true);
    try {
      const callbackURL = `${window.location.origin}/auth-callback?redirect=${encodeURIComponent(redirectUrl)}`;
      const res = await fetch("/api/auth/sign-in/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ provider: "google", callbackURL }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.message || t("auth.oauthSignInFailed"));
    } catch {
      setError(t("auth.oauthSignInFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || t("auth.signInFailed"));
        return;
      }
      window.location.href = redirectUrl;
    } catch {
      setError(t("auth.signInFailed"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 flex flex-col gap-5">
      <div className="text-center flex flex-col items-center gap-1.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563eb]">{appName}</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B]">{t("auth.signIn")}</h1>
      </div>
      {error && <FormErrorBanner message={error} />}
      <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleGoogle} className="w-full h-10">
        {t("auth.signInWithGoogle")}
      </Button>
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
          {t("auth.or")}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FormLabel htmlFor="signin-email" required>{t("auth.emailLabel")}</FormLabel>
          <input id="signin-email" type="email" required autoFocus value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <FormLabel htmlFor="signin-password" required>{t("auth.passwordLabel")}</FormLabel>
            <a href={forgotPasswordHref} className="text-xs font-semibold text-[#2563eb] hover:underline">{t("auth.forgotPassword")}</a>
          </div>
          <input id="signin-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
        </div>
        <Button type="submit" disabled={isSubmitting || !email || !password} className="w-full h-10">
          {t("auth.signIn")}
        </Button>
      </form>
      <p className="text-center text-xs text-slate-500">
        <a href={signUpHref} className="font-bold text-[#2563eb] hover:underline">{t("auth.signUp")}</a>
      </p>
    </div>
  );
}
