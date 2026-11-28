"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import type { InviteAcceptFlowProps } from "../ui-contracts.js";

export function InviteAcceptFlow({
  inviteDetails,
  isLoading = false,
  isAccepting = false,
  onAccept,
  onSignOut,
  onReturnHome,
}: InviteAcceptFlowProps) {
  if (isLoading) {
    return <p className="text-center text-sm text-slate-500">{t("memberInvite.acceptSubtitle")}</p>;
  }

  if (inviteDetails.status !== "VALID") {
    const errorKey =
      inviteDetails.status === "EXPIRED"
        ? "memberInvite.inviteExpiredError"
        : inviteDetails.status === "ALREADY_ACCEPTED"
          ? "memberInvite.inviteAlreadyAccepted"
          : "auth.invalidToken";
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-red-600">{t(errorKey)}</p>
        {onReturnHome && (
          <button type="button" onClick={onReturnHome} className="h-10 rounded-lg border border-slate-300 px-4 text-sm">
            {t("common.back")}
          </button>
        )}
      </div>
    );
  }

  if (inviteDetails.emailMismatch) {
    return (
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm text-amber-700 dark:text-amber-400">{t("memberInvite.wrongAccountPrivacyHint")}</p>
        {onSignOut && (
          <button type="button" onClick={onSignOut} className="h-10 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white">
            {t("settings.signOut")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
        {t("memberInvite.joinHouseholdNamedSubtitle", { householdName: inviteDetails.householdName })}
      </h2>
      <p className="text-xs text-slate-500">{`${t("memberInvite.invitedEmailLabel")}: ${inviteDetails.inviteEmail}`}</p>
      <button type="button" disabled={isAccepting} onClick={onAccept} className="h-10 w-full rounded-lg bg-blue-600 px-4 text-sm font-medium text-white disabled:opacity-50">
        {isAccepting ? t("common.loading") : t("notifications.inngest.acceptInviteCta")}
      </button>
    </div>
  );
}
