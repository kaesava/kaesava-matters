import React, { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS } from "@kaesava/ui/mobile";
import { authClient } from "../../lib/auth";
import { setActiveSessionToken, setActiveTenantId, switchActiveTenant, trpc } from "../../lib/trpc";

export default function MobileAuthCallbackScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { token, error, redirect } = useLocalSearchParams<{ token?: string; error?: string; redirect?: string }>();

  useEffect(() => {
    let active = true;
    async function finalizeOAuth() {
      if (error) return router.replace(`/(auth)/sign-in?error=${encodeURIComponent(error)}` as Href);
      if (token) {
        setActiveSessionToken(token);
        await SecureStore.setItemAsync("tradie-matters_session_token", token).catch(() => {});
      }
      const session = await authClient
        .getSession(token ? { fetchOptions: { headers: { Authorization: `Bearer ${token}` } } } : undefined)
        .catch(() => null);
      if (!active) return;
      if (!token && !session?.data?.user) {
        return router.replace("/(auth)/sign-in?error=oauth_failed" as Href);
      }
      if (redirect && redirect.startsWith("/invite/")) {
        return router.replace(`/(auth)${redirect}` as Href);
      }
      const status = await utils.getTenantStatus.fetch();
      if (!active) return;
      if (!status.hasTenant) return router.replace("/(auth)/complete-profile" as Href);
      if (status.tenantId) {
        setActiveTenantId(status.tenantId);
        await switchActiveTenant(status.tenantId, utils);
      }
      router.replace((status.setupCompleted ? "/(app)/today" : "/(setup)/business") as Href);
    }
    void finalizeOAuth();
    return () => {
      active = false;
    };
  }, [token, error, redirect, router, utils]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      <Text style={styles.label}>{t("common.completingAuth")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: DESIGN_TOKENS.colors.background, gap: 12 },
  label: { fontSize: 14, fontWeight: "600", color: DESIGN_TOKENS.colors.textMuted },
});
