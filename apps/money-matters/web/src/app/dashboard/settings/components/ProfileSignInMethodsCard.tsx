"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Button, ConfirmDialog } from "@kaesava/ui/web";
import { useSignInMethods } from "./useSignInMethods";
import { AccountPasswordModal } from "./AccountPasswordModal";

export function ProfileSignInMethodsCard() {
  const sm = useSignInMethods();

  return (
    <>
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
        <div className="border-b border-slate-100 pb-4">
          <h3 className="text-base font-extrabold text-[#1B2B4B]">
            {t("settings.profile.signInMethods.title")}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("settings.profile.signInMethods.subtitle")}
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-[#1B2B4B]">
                {t("settings.profile.signInMethods.emailPasswordLabel")}
              </span>
              {!sm.isLoading && (
                <span className={`text-[11px] font-medium ${sm.hasPassword ? "text-slate-500" : "text-slate-400"}`}>
                  {sm.hasPassword
                    ? t("settings.profile.signInMethods.passwordSet")
                    : t("settings.profile.signInMethods.passwordNotSet")}
                </span>
              )}
            </div>
            <Button variant="secondary" size="sm" disabled={sm.isLoading} onClick={() => sm.setIsPasswordModalOpen(true)}>
              {sm.hasPassword
                ? t("settings.profile.signInMethods.changePasswordCta")
                : t("settings.profile.signInMethods.setPasswordCta")}
            </Button>
          </div>

          <div className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-[#1B2B4B]">
                  {t("settings.profile.signInMethods.googleLabel")}
                </span>
                {!sm.isLoading && (
                  <span className={`text-[11px] font-medium ${sm.hasGoogle ? "text-slate-500" : "text-slate-400"}`}>
                    {sm.hasGoogle
                      ? t("settings.profile.signInMethods.connected")
                      : t("settings.profile.signInMethods.notConnected")}
                  </span>
                )}
              </div>
              {sm.hasGoogle ? (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={sm.isLoading || !sm.hasPassword || sm.isDisconnectingGoogle}
                  onClick={() => sm.setIsDisconnectConfirmOpen(true)}
                >
                  {t("settings.profile.signInMethods.disconnectGoogleCta")}
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={sm.isLoading || sm.isLinkingGoogle}
                  loading={sm.isLinkingGoogle}
                  onClick={sm.handleConnectGoogle}
                >
                  {t("settings.profile.signInMethods.connectGoogleCta")}
                </Button>
              )}
            </div>
            {!sm.isLoading && sm.hasGoogle && !sm.hasPassword && (
              <p className="text-[11px] text-slate-500">
                {t("settings.profile.signInMethods.setPasswordFirstHint")}
              </p>
            )}
          </div>
        </div>
      </div>

      <AccountPasswordModal
        isOpen={sm.isPasswordModalOpen}
        hasPassword={sm.hasPassword}
        onClose={() => sm.setIsPasswordModalOpen(false)}
      />

      {sm.isDisconnectConfirmOpen && (
        <ConfirmDialog
          isOpen={sm.isDisconnectConfirmOpen}
          title={t("settings.profile.signInMethods.disconnectConfirmTitle")}
          description={t("settings.profile.signInMethods.disconnectConfirmBody")}
          confirmLabel={t("settings.profile.signInMethods.disconnectGoogleCta")}
          cancelLabel={t("common.cancel")}
          variant="danger"
          onConfirm={sm.handleDisconnectGoogle}
          onClose={() => sm.setIsDisconnectConfirmOpen(false)}
        />
      )}
    </>
  );
}
