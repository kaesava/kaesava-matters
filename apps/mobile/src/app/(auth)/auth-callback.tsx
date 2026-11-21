import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { t } from "@money-matters/i18n";
import { DESIGN_TOKENS } from "@money-matters/ui/mobile";
import { authClient } from "../../lib/auth";
import { trpc, setActiveSessionToken, setActiveTenantId, switchActiveTenant } from "../../lib/trpc";

export default function MobileAuthCallbackScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { token, error, redirect } = useLocalSearchParams<{ token?: string; error?: string; redirect?: string }>();

  useEffect(() => {
    let active = true;
    async function finalizeOAuth() {
      if (error) {
        router.replace(`/(auth)/sign-in?error=${encodeURIComponent(error)}` as Href);
        return;
      }

      if (token) {
        setActiveSessionToken(token);
        await SecureStore.setItemAsync("money-matters_session_token", token);
        await SecureStore.setItemAsync("money-matters-session-token", token);
        await SecureStore.setItemAsync("auth_session_token", token);
      }

      // The OAuth round-trip lands in the system browser, so the expo cookie jar is empty;
      // authenticate this check with the returned bearer token instead.
      const session = await authClient
        .getSession(token ? { fetchOptions: { headers: { Authorization: `Bearer ${token}` } } } : undefined)
        .catch(() => null);
      if (!active) return;

      // With a token, tRPC (Bearer-authenticated) below is the authoritative validity check.
      if (!token && !session?.data?.user) {
        router.replace("/(auth)/sign-in?error=oauth_failed" as Href);
        return;
      }

      if (redirect && redirect.startsWith("/invite/")) {
        router.replace(`/(auth)${redirect}` as Href);
        return;
      }

      const status = await utils.getTenantStatus.fetch();
      if (!active) return;

      if (!status.hasTenant) {
        router.replace("/(auth)/complete-profile" as Href);
        return;
      }

      if (status.tenantId) {
        setActiveTenantId(status.tenantId);
        await switchActiveTenant(status.tenantId, utils);
      }

      if (!status.setupCompleted) {
        router.replace("/(setup)/income" as Href);
        return;
      }

      router.replace("/(app)/home" as Href);
    }

    void finalizeOAuth();
    return () => {
      active = false;
    };
  }, [token, error, router, utils]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      <Text style={styles.label}>{t("common.completingAuth")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: DESIGN_TOKENS.colors.background,
    gap: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: DESIGN_TOKENS.colors.textMuted,
  },
});
