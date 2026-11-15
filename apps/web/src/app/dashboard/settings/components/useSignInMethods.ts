"use client";

import { useState, useEffect } from "react";
import { t } from "@money-matters/i18n";
import { useToast } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";
import { authClient } from "../../../../lib/auth";

export function useSignInMethods() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const { data: authMethods, isLoading } = trpc.getAuthMethods.useQuery();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);

  useEffect(() => {
    const reset = () => setIsLinkingGoogle(false);
    window.addEventListener("pageshow", reset);
    window.addEventListener("focus", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("focus", reset);
    };
  }, []);

  const handleConnectGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTarget = "/dashboard/settings?tab=profile";
      const callbackPath = `/auth-callback?redirect=${encodeURIComponent(redirectTarget)}`;
      const errorPath = `${redirectTarget}&error=oauth_failed`;
      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL: origin ? `${origin}${callbackPath}` : callbackPath,
        errorCallbackURL: origin ? `${origin}${errorPath}` : errorPath,
        disableRedirect: true,
      });

      if (result?.error) {
        setIsLinkingGoogle(false);
        toast.error(result.error.message || t("settings.profile.signInMethods.googleConnectFailed"));
        return;
      }

      const targetUrl = result?.data && "url" in result.data ? result.data.url : undefined;
      if (targetUrl) {
        const authUrl = new URL(targetUrl);
        if (authUrl.hostname.endsWith("google.com")) {
          authUrl.searchParams.set("prompt", "select_account");
        }
        window.location.assign(authUrl.toString());
        return;
      }
      setIsLinkingGoogle(false);
      await utils.getAuthMethods.invalidate();
      toast.success(t("settings.profile.signInMethods.googleConnectedSuccess"));
    } catch {
      setIsLinkingGoogle(false);
      toast.error(t("settings.profile.signInMethods.googleConnectFailed"));
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnectingGoogle(true);
    try {
      const accountsRes = await authClient.listAccounts();
      const googleAccount = accountsRes?.data?.find(
        (acc: { id?: string; providerId: string; accountId: string }) => acc.providerId === "google"
      );
      const accountId = googleAccount?.accountId ?? authMethods?.googleAccountId ?? undefined;
      if (!accountId) {
        toast.error(t("settings.profile.signInMethods.googleDisconnectFailed"));
        return;
      }
      let result = await authClient.unlinkAccount({
        providerId: "google",
        accountId,
      });
      if (
        result?.error &&
        googleAccount?.id &&
        googleAccount.id !== accountId &&
        (result.error.code === "ACCOUNT_NOT_FOUND" || /account not found/i.test(result.error.message || ""))
      ) {
        result = await authClient.unlinkAccount({
          providerId: "google",
          accountId: googleAccount.id,
        });
      }
      if (result?.error) {
        toast.error(result.error.message || t("settings.profile.signInMethods.googleDisconnectFailed"));
        return;
      }
      await utils.getAuthMethods.invalidate();
      setIsDisconnectConfirmOpen(false);
      toast.success(t("settings.profile.signInMethods.googleDisconnectedSuccess"));
    } catch {
      toast.error(t("settings.profile.signInMethods.googleDisconnectFailed"));
    } finally {
      setIsDisconnectingGoogle(false);
    }
  };

  return {
    hasPassword: authMethods?.hasPassword ?? false,
    hasGoogle: authMethods?.hasGoogle ?? false,
    isLoading,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    isDisconnectConfirmOpen,
    setIsDisconnectConfirmOpen,
    isLinkingGoogle,
    isDisconnectingGoogle,
    handleConnectGoogle,
    handleDisconnectGoogle,
  };
}
