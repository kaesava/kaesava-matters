import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Redirect } from "expo-router";
import { DESIGN_TOKENS, MobileLogo } from "@kaesava/ui/mobile";
import { authClient } from "../lib/auth";
import { trpc } from "../lib/trpc";

export default function IndexRoute() {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const {
    data: status,
    isPending: statusPending,
    error,
  } = trpc.getTenantStatus.useQuery(undefined, {
    enabled: !!session,
    retry: false,
  });

  if (sessionPending || (session && statusPending)) {
    return (
      <View style={styles.container}>
        <MobileLogo size={64} source={require("../../assets/icon.png")} />
        <ActivityIndicator size="large" color={DESIGN_TOKENS.colors.accent} />
      </View>
    );
  }

  if (!session) return <Redirect href="/(auth)/sign-in" />;
  if (error || !status?.hasTenant) return <Redirect href="/(auth)/complete-profile" />;
  if (!status?.setupCompleted) return <Redirect href="/(setup)/business" />;
  return <Redirect href="/(app)/today" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    backgroundColor: DESIGN_TOKENS.colors.background,
  },
});
