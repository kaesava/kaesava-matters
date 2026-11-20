"use client";

import { useRouter } from "next/navigation";
import { t } from "@money-matters/i18n";
import { Spinner } from "@money-matters/ui/web";
import { authClient } from "../../../../lib/auth";

interface InviteStatusCardProps {
  variant: "loading" | "success" | "expired" | "already_accepted" | "invalid" | "error";
  token: string;
  errorMsg?: string;
  activeEmail?: string | null;
  onSignedOut?: () => void;
}

export function InviteStatusCard({
  variant,
  token,
  errorMsg = "",
  activeEmail,
  onSignedOut,
}: InviteStatusCardProps) {
  const router = useRouter();

  if (variant === "loading") {
    return (
      <div className="space-y-4">
        <Spinner size="lg" className="text-[#2563eb] mx-auto" />
        <h1 className="text-xl font-extrabold text-[#1B2B4B]">{t("memberInvite.acceptTitle")}</h1>
        <p className="text-xs text-slate-500">{t("memberInvite.acceptSubtitle")}</p>
      </div>
    );
  }

  if (variant === "success") {
    return (
      <div className="space-y-4">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
          ✓
        </div>
        <h1 className="text-xl font-extrabold text-[#1B2B4B]">{t("memberInvite.acceptSuccessTitle")}</h1>
        <p className="text-xs text-slate-500">{t("memberInvite.acceptSuccessMessage")}</p>
      </div>
    );
  }

  const isEmailMismatch =
    variant === "error" &&
    (errorMsg.toLowerCase().includes("does not match") ||
      errorMsg.toLowerCase().includes("switch accounts"));

  const message =
    variant === "expired"
      ? t("memberInvite.inviteExpiredError")
      : variant === "already_accepted"
        ? t("memberInvite.inviteAlreadyAccepted")
        : variant === "invalid"
          ? t("memberInvite.invalidToken")
          : isEmailMismatch
            ? t("memberInvite.wrongAccountPrivacyHint")
            : errorMsg || t("memberInvite.invalidToken");

  const handleSignOut = async () => {
    await authClient.signOut();
    if (onSignedOut) {
      onSignedOut();
    } else {
      router.replace(`/invite/${token}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center text-2xl mx-auto font-bold">
        ⚠️
      </div>
      <h1 className="text-xl font-extrabold text-[#1B2B4B]">
        {isEmailMismatch ? t("memberInvite.wrongAccountTitle") : t("memberInvite.acceptErrorTitle")}
      </h1>
      {isEmailMismatch && activeEmail && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2.5 text-xs text-amber-900 font-medium">
          {t("memberInvite.signedInAsNote", { email: activeEmail })}
        </div>
      )}
      <p className="text-xs text-slate-500 leading-relaxed">{message}</p>
      <div className="flex flex-col gap-2 pt-2">
        {isEmailMismatch && (
          <button
            type="button"
            onClick={handleSignOut}
            className="bg-[#2563eb] text-white text-xs font-extrabold px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors w-full cursor-pointer"
          >
            {t("memberInvite.signOutAndContinue")}
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push(activeEmail ? "/dashboard" : "/")}
          className="text-xs font-bold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-xl transition-colors cursor-pointer"
        >
          {activeEmail ? t("memberInvite.goToDashboard") : t("public.backToHome")}
        </button>
      </div>
    </div>
  );
}
