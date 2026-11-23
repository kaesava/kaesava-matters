"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, FormFieldError, FormErrorBanner } from "@kaesava/ui/web";
import { InviteSignUpInputSchema } from "@kaesava/types";
import { authClient } from "../../../../lib/auth";
import { PasswordStrengthIndicator } from "@kaesava/capability-auth/web";

interface InviteNewUserFormProps {
  inviteEmail: string;
  onAuthenticated: () => void;
  onNeedOtp: (password: string) => void;
}

export function InviteNewUserForm({ inviteEmail, onAuthenticated, onNeedOtp }: InviteNewUserFormProps) {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const parsed = InviteSignUpInputSchema.safeParse({
      name: name.trim(),
      password,
      confirmPassword,
      agreedToTerms,
    });
    if (!parsed.success) {
      const code = parsed.error.issues[0]?.message;
      const msg =
        code === "passwordTooShort"
          ? t("auth.passwordTooShort")
          : code === "passwordsMustMatch"
            ? t("auth.passwordsMustMatch")
            : code === "mustAgreeToTerms"
              ? t("auth.mustAgreeToTerms")
              : t("auth.fillAllFields");
      setFormError(msg);
      return;
    }

    setLoading(true);
    try {
      const res = await authClient.signUp.email({
        email: inviteEmail,
        password,
        name: name.trim(),
      });
      if (res.error) {
        setFormError(res.error.message || t("auth.signUpErrorTitle"));
        setLoading(false);
        return;
      }
      const sessionData = await authClient.getSession();
      if (sessionData.data?.session) {
        onAuthenticated();
      } else {
        onNeedOtp(password);
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : t("auth.unexpectedError"));
      setLoading(false);
    }
  };

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isValid = name.trim().length >= 2 && password.length >= 8 && confirmPassword === password && agreedToTerms;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      {formError && <FormErrorBanner message={formError} />}
      <div>
        <FormLabel required={true} htmlFor="invite-name">{t("auth.nameLabel")}</FormLabel>
        <input
          id="invite-name"
          type="text"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("auth.namePlaceholder")}
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>
      <div>
        <FormLabel required={true} htmlFor="invite-password">{t("auth.passwordLabel")}</FormLabel>
        <input
          id="invite-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        {password.length > 0 && <PasswordStrengthIndicator password={password} />}
      </div>
      <div>
        <FormLabel required={true} htmlFor="invite-confirm">{t("auth.confirmPasswordLabel")}</FormLabel>
        <input
          id="invite-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder={t("auth.confirmPasswordPlaceholder")}
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
        <FormFieldError error={passwordMismatch ? t("auth.passwordsMustMatch") : undefined} />
      </div>
      <div className="flex items-start gap-2 pt-1">
        <input
          id="invite-terms"
          type="checkbox"
          checked={agreedToTerms}
          onChange={(e) => setAgreedToTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded text-[#2563eb] border-slate-300"
        />
        <label htmlFor="invite-terms" className="text-[11px] text-slate-600 leading-snug">
          {t("auth.agreeTermsPrefix")}{" "}
          <Link href="/terms" target="_blank" className="text-[#2563eb] hover:underline font-semibold">{t("landing.footerTerms")}</Link>{" "}
          {t("auth.agreeTermsAnd")}{" "}
          <Link href="/privacy" target="_blank" className="text-[#2563eb] hover:underline font-semibold">{t("landing.footerPrivacy")}</Link>
        </label>
      </div>
      <Button type="submit" loading={loading} disabled={!isValid || loading} className="w-full mt-1">
        {t("memberInvite.continueWithPassword")}
      </Button>
    </form>
  );
}
