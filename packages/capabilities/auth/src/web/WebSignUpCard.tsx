"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, FormErrorBanner, Logo } from "@kaesava/ui/web";
import { PasswordStrengthIndicator } from "./PasswordStrengthIndicator.js";

export interface WebSignUpCardProps {
  appName: string;
  redirectUrl?: string;
  signInHref?: string;
}

export function WebSignUpCard({
  appName,
  redirectUrl = "/dashboard",
  signInHref = "/sign-in",
}: WebSignUpCardProps) {
  const [name, setName] = useState("");
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
      const res = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || t("auth.signUpErrorGeneric"));
        return;
      }
      window.location.href = redirectUrl;
    } catch {
      setError(t("auth.signUpErrorGeneric"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 p-8 flex flex-col gap-5">
      <div className="text-center flex flex-col items-center gap-1.5">
        <Logo size="lg" brandName={appName} />
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#2563eb]">{appName}</span>
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1B2B4B]">{t("auth.signUp")}</h1>
      </div>
      {error && <FormErrorBanner message={error} />}
      <Button type="button" variant="secondary" disabled={isSubmitting} onClick={handleGoogle} className="w-full h-10">
        {t("auth.signUpWithGoogle")}
      </Button>
      <div className="relative flex items-center justify-center">
        <div className="border-t border-slate-200 w-full" />
        <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
          {t("auth.or")}
        </span>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <FormLabel htmlFor="signup-name" required>{t("auth.nameLabel")}</FormLabel>
          <input id="signup-name" type="text" required autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
        </div>
        <div>
          <FormLabel htmlFor="signup-email" required>{t("auth.emailLabel")}</FormLabel>
          <input id="signup-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
        </div>
        <div>
          <FormLabel htmlFor="signup-password" required>{t("auth.passwordLabel")}</FormLabel>
          <input id="signup-password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm text-[#1B2B4B]" />
          <PasswordStrengthIndicator password={password} />
        </div>
        <Button type="submit" disabled={isSubmitting || !name || !email || password.length < 8} className="w-full h-10">
          {t("auth.signUp")}
        </Button>
      </form>
      <p className="text-center text-xs text-slate-500">
        {t("auth.signInPrompt")}{" "}
        <a href={signInHref} className="font-bold text-[#2563eb] hover:underline">{t("auth.signIn")}</a>
      </p>
    </div>
  );
}
