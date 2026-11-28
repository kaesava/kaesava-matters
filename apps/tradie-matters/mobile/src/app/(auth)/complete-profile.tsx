import React, { useState } from "react";
import { KeyboardAvoidingView, ScrollView, StyleSheet } from "react-native";
import { useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";
import { MobileCompleteProfileView } from "@kaesava/capability-auth/mobile";
import { authClient } from "../../lib/auth";
import { setActiveTenantId, trpc } from "../../lib/trpc";

export default function CompleteProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [error, setError] = useState<string | null>(null);

  const createTenantMut = trpc.createTenant.useMutation({
    onSuccess: async (res) => {
      if (res?.tenantId) setActiveTenantId(res.tenantId);
      await utils.getTenantStatus.invalidate();
      router.replace("/(setup)/business" as Href);
    },
    onError: (err) => setError(err.message || t("common.errorTryAgain")),
  });

  const handleSubmit = async (data: { name: string; householdName: string }) => {
    setError(null);
    await authClient.updateUser({ name: data.name }).catch(() => {});
    await createTenantMut.mutateAsync({ householdName: data.householdName });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={PLATFORM_STYLE.keyboardBehavior}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: Math.max(insets.top + 24, 48), paddingBottom: Math.max(insets.bottom + 24, 48) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <MobileCompleteProfileView
          defaultName={session?.user?.name || ""}
          householdLabel={t("tradieSetup.businessNameLabel")}
          householdPlaceholder={t("tradieMobile.businessNamePlaceholder")}
          isSubmitting={createTenantMut.isPending}
          error={error}
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: DESIGN_TOKENS.colors.background },
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20 },
});
