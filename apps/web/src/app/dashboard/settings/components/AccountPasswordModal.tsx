"use client";

import React from "react";
import { t } from "@money-matters/i18n";
import { ModalDialog, FormLabel, Input, FormFieldError, FormErrorBanner, Button } from "@money-matters/ui/web";
import { useAccountPasswordForm } from "./useAccountPasswordForm";

interface AccountPasswordModalProps {
  isOpen: boolean;
  hasPassword: boolean;
  onClose: () => void;
}

export function AccountPasswordModal({ isOpen, hasPassword, onClose }: AccountPasswordModalProps) {
  const form = useAccountPasswordForm(isOpen, hasPassword, onClose);
  const title = hasPassword
    ? t("settings.profile.signInMethods.changePasswordCta")
    : t("settings.profile.signInMethods.setPasswordCta");

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={title} isDirty={form.isDirty} maxWidth="max-w-md">
      <form onSubmit={form.handleSubmit} className="space-y-4">
        {form.errorMsg && <FormErrorBanner message={form.errorMsg} />}
        {hasPassword && (
          <div>
            <FormLabel required>{t("settings.profile.signInMethods.currentPasswordLabel")}</FormLabel>
            <Input
              type="password"
              value={form.currentPassword}
              onChange={(e) => form.setCurrentPassword(e.target.value)}
              autoFocus
              className="h-10"
              autoComplete="current-password"
            />
          </div>
        )}
        <div>
          <FormLabel required>{t("settings.profile.signInMethods.newPasswordLabel")}</FormLabel>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => form.setPassword(e.target.value)}
            autoFocus={!hasPassword}
            className="h-10"
            autoComplete="new-password"
          />
          {form.password.length > 0 && form.password.length < 8 && (
            <FormFieldError error={t("auth.passwordTooShort")} />
          )}
        </div>
        <div>
          <FormLabel required>{t("settings.profile.signInMethods.confirmNewPasswordLabel")}</FormLabel>
          <Input
            type="password"
            value={form.confirmPassword}
            onChange={(e) => form.setConfirmPassword(e.target.value)}
            className="h-10"
            autoComplete="new-password"
          />
          {form.confirmMismatch && <FormFieldError error={t("auth.passwordsMustMatch")} />}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={form.isSubmitting}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={!form.isDirty || !form.isValid || form.isSubmitting} loading={form.isSubmitting}>
            {title}
          </Button>
        </div>
      </form>
    </ModalDialog>
  );
}
