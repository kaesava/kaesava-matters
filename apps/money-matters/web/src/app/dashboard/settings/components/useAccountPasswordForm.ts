"use client";

import { useState, useEffect } from "react";
import { t } from "@kaesava/i18n";
import { useToast } from "@kaesava/ui/web";
import { SetAccountPasswordFormSchema, ChangeAccountPasswordFormSchema } from "@kaesava/types";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";

export function useAccountPasswordForm(isOpen: boolean, hasPassword: boolean, onClose: () => void) {
  const toast = useToast();
  const utils = trpc.useUtils();
  const setPasswordMutation = trpc.setAccountPassword.useMutation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCurrentPassword("");
      setPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
    }
  }, [isOpen]);

  const parsed = hasPassword
    ? ChangeAccountPasswordFormSchema.safeParse({ currentPassword, password, confirmPassword })
    : SetAccountPasswordFormSchema.safeParse({ password, confirmPassword });

  const isDirty = Boolean(currentPassword || password || confirmPassword);
  const isValid = parsed.success;
  const confirmMismatch = Boolean(confirmPassword && password !== confirmPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      if (hasPassword) {
        const res = await authClient.changePassword({
          currentPassword,
          newPassword: password,
          revokeOtherSessions: false,
        });
        if (res?.error) {
          setErrorMsg(res.error.message || t("settings.profile.signInMethods.passwordUpdateFailed"));
          return;
        }
        toast.success(t("settings.profile.signInMethods.passwordChangeSuccess"));
      } else {
        await setPasswordMutation.mutateAsync({ newPassword: password });
        await utils.getAuthMethods.invalidate();
        toast.success(t("settings.profile.signInMethods.passwordSetSuccess"));
      }
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : t("settings.profile.signInMethods.passwordUpdateFailed")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    currentPassword,
    setCurrentPassword,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    errorMsg,
    isSubmitting,
    isDirty,
    isValid,
    confirmMismatch,
    handleSubmit,
  };
}
