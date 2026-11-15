import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { t } from "@money-matters/i18n";
import { showMobileConfirm, useMobileToast } from "@money-matters/ui/mobile";
import { trpc } from "../../../lib/trpc";
import { authClient, DEFAULT_AUTH_ORIGIN } from "../../../lib/auth";

export function useMobileSignInMethods() {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: authMethods, isLoading } = trpc.getAuthMethods.useQuery(undefined, {
    staleTime: 0,
    refetchOnMount: "always",
  });
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [isDisconnectingGoogle, setIsDisconnectingGoogle] = useState(false);

  const handleConnectGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const devOrigin = DEFAULT_AUTH_ORIGIN;
      const callbackURL = __DEV__
        ? `${devOrigin}/dev-callback/moneymatters/auth-callback`
        : "https://moneymatters.kaesava.au/auth-callback?platform=mobile";
      const errorCallbackURL = __DEV__
        ? `${devOrigin}/dev-callback/moneymatters/auth-callback?error=oauth_failed`
        : "https://moneymatters.kaesava.au/auth-callback?platform=mobile&error=oauth_failed";

      const result = await authClient.linkSocial({
        provider: "google",
        callbackURL,
        errorCallbackURL,
        disableRedirect: true,
      });

      if (result?.error) {
        toast.error(result.error.message || t("settings.profile.signInMethods.googleConnectFailed"));
        return;
      }

      const targetUrl = result?.data && "url" in result.data ? result.data.url : undefined;
      if (!targetUrl) {
        await utils.getAuthMethods.invalidate();
        toast.success(t("settings.profile.signInMethods.googleConnectedSuccess"));
        return;
      }

      const authUrl = new URL(targetUrl);
      if (authUrl.hostname.endsWith("google.com")) {
        authUrl.searchParams.set("prompt", "select_account");
      }

      const browserResult = await WebBrowser.openAuthSessionAsync(
        authUrl.toString(),
        "moneymatters://auth-callback"
      );

      if (browserResult.type === "success" && browserResult.url) {
        const returnedUrl = new URL(browserResult.url);
        if (returnedUrl.searchParams.get("error")) {
          toast.error(t("settings.profile.signInMethods.googleConnectFailed"));
          return;
        }
        await utils.getAuthMethods.invalidate();
        toast.success(t("settings.profile.signInMethods.googleConnectedSuccess"));
      }
    } catch {
      toast.error(t("settings.profile.signInMethods.googleConnectFailed"));
    } finally {
      setIsLinkingGoogle(false);
    }
  };

  const handleDisconnectGoogle = () => {
    showMobileConfirm({
      title: t("settings.profile.signInMethods.disconnectConfirmTitle"),
      message: t("settings.profile.signInMethods.disconnectConfirmBody"),
      confirmLabel: t("settings.profile.signInMethods.disconnectGoogleCta"),
      cancelLabel: t("common.cancel"),
      isDestructive: true,
      onConfirm: async () => {
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
          let res = await authClient.unlinkAccount({
            providerId: "google",
            accountId,
          });
          if (
            res?.error &&
            googleAccount?.id &&
            googleAccount.id !== accountId &&
            (res.error.code === "ACCOUNT_NOT_FOUND" || /account not found/i.test(res.error.message || ""))
          ) {
            res = await authClient.unlinkAccount({
              providerId: "google",
              accountId: googleAccount.id,
            });
          }
          if (res?.error) {
            toast.error(res.error.message || t("settings.profile.signInMethods.googleDisconnectFailed"));
            return;
          }
          await utils.getAuthMethods.invalidate();
          toast.success(t("settings.profile.signInMethods.googleDisconnectedSuccess"));
        } catch {
          toast.error(t("settings.profile.signInMethods.googleDisconnectFailed"));
        } finally {
          setIsDisconnectingGoogle(false);
        }
      },
    });
  };

  return {
    hasPassword: authMethods?.hasPassword ?? false,
    hasGoogle: authMethods?.hasGoogle ?? false,
    isLoading,
    isPasswordModalOpen,
    setIsPasswordModalOpen,
    isLinkingGoogle,
    isDisconnectingGoogle,
    handleConnectGoogle,
    handleDisconnectGoogle,
  };
}
