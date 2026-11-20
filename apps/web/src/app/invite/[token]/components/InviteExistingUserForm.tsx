"use client";

import React, { useState } from "react";
import Link from "next/link";
import { t } from "@money-matters/i18n";
import { Button, FormLabel, FormErrorBanner } from "@money-matters/ui/web";
import { authClient } from "../../../../lib/auth";

interface InviteExistingUserFormProps {
  inviteEmail: string;
  onAuthenticated: () => void;
  onNeedOtp: (password: string) => void;
}

export function InviteExistingUserForm({
  inviteEmail,
  onAuthenticated,
  onNeedOtp,
}: InviteExistingUserFormProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);
    try {
      const res = await authClient.signIn.email({ email: inviteEmail, password });
      if (res.error) {
        const msg = res.error.message || "";
        const code = (res.error as { code?: string }).code || "";
        if (code === "EMAIL_NOT_VERIFIED" || msg.toLowerCase().includes("not verified")) {
          await authClient.emailOtp
            .sendVerificationOtp({ email: inviteEmail, type: "email-verification" })
            .catch(() => {});
          onNeedOtp(password);
          return;
        }
        setFormError(t("auth.signInFailed"));
        setLoading(false);
        return;
      }
      onAuthenticated();
    } catch {
      setFormError(t("auth.unexpectedError"));
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
      {formError && <FormErrorBanner message={formError} />}
      <div>
        <div className="flex items-center justify-between mb-1">
          <FormLabel required={true} htmlFor="invite-existing-password">
            {t("auth.passwordLabel")}
          </FormLabel>
          <Link href="/forgot-password" className="text-[11px] font-semibold text-[#2563eb] hover:underline">
            {t("auth.forgotPassword")}
          </Link>
        </div>
        <input
          id="invite-existing-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("auth.passwordPlaceholder")}
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563eb]"
        />
      </div>
      <Button type="submit" loading={loading} disabled={password.length === 0 || loading} className="w-full mt-1">
        {t("memberInvite.signInAndJoin")}
      </Button>
    </form>
  );
}
