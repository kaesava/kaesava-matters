"use client";

import { useState } from "react";
import { t } from "@money-matters/i18n";
import { FormErrorBanner, FormLabel } from "@money-matters/ui/web";
import { InviteAccountStatus } from "@money-matters/types";
import { SocialAuthButtons } from "../../../../components/auth/SocialAuthButtons";
import { OtpVerificationView } from "../../../../components/auth/OtpVerificationView";
import { InviteNewUserForm } from "./InviteNewUserForm";
import { InviteExistingUserForm } from "./InviteExistingUserForm";

interface InviteAuthCardProps {
  token: string;
  inviteEmail: string;
  householdName: string;
  accountStatus: InviteAccountStatus;
  onAuthenticated: () => void;
}

export function InviteAuthCard({
  token,
  inviteEmail,
  householdName,
  accountStatus,
  onAuthenticated,
}: InviteAuthCardProps) {
  const [socialError, setSocialError] = useState<string | null>(null);
  const [needOtpPassword, setNeedOtpPassword] = useState<string | null>(null);

  if (needOtpPassword !== null) {
    return (
      <OtpVerificationView
        email={inviteEmail}
        password={needOtpPassword}
        onSuccess={onAuthenticated}
        onCancel={() => setNeedOtpPassword(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("memberInvite.joinHouseholdTitle")}</h1>
        <p className="text-xs text-slate-500">
          {householdName
            ? t("memberInvite.joinHouseholdNamedSubtitle", { householdName })
            : t("memberInvite.joinHouseholdSubtitle")}
        </p>
      </div>

      <div className="text-left">
        <FormLabel htmlFor="invite-readonly-email">{t("memberInvite.invitedEmailLabel")}</FormLabel>
        <input
          id="invite-readonly-email"
          type="email"
          value={inviteEmail}
          readOnly
          disabled
          className="w-full h-10 px-3.5 text-sm rounded-xl border border-slate-200 bg-slate-50 text-slate-600 cursor-not-allowed"
        />
      </div>

      {socialError && <FormErrorBanner message={socialError} />}

      <SocialAuthButtons
        mode={accountStatus === "NEW" ? "signUp" : "signIn"}
        redirectUrl={`/invite/${token}`}
        onError={(msg) => setSocialError(msg)}
      />

      {accountStatus === "GOOGLE_ONLY" ? (
        <p className="text-xs text-slate-500">{t("memberInvite.googleOnlyInviteNote")}</p>
      ) : (
        <>
          <div className="relative flex items-center justify-center my-1">
            <div className="border-t border-slate-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              {t("auth.or")}
            </span>
            <div className="border-t border-slate-200 w-full" />
          </div>
          {accountStatus === "NEW" ? (
            <InviteNewUserForm
              inviteEmail={inviteEmail}
              onAuthenticated={onAuthenticated}
              onNeedOtp={(pwd) => setNeedOtpPassword(pwd)}
            />
          ) : (
            <InviteExistingUserForm
              inviteEmail={inviteEmail}
              onAuthenticated={onAuthenticated}
              onNeedOtp={(pwd) => setNeedOtpPassword(pwd)}
            />
          )}
        </>
      )}
    </div>
  );
}
