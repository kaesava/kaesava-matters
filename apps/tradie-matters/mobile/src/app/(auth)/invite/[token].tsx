import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DESIGN_TOKENS, useMobileToast } from "@kaesava/ui/mobile";
import { MobileInviteAcceptFlow } from "@kaesava/capability-tenant/mobile";
import { t } from "@kaesava/i18n";
import { authClient } from "../../../lib/auth";
import { setActiveTenantId, trpc } from "../../../lib/trpc";

export default function AcceptInviteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const toast = useMobileToast();
  const { token = "" } = useLocalSearchParams<{ token?: string }>();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const inviteQuery = trpc.getInviteDetails.useQuery(
    { inviteToken: token },
    { enabled: Boolean(token), retry: false }
  );

  const acceptMut = trpc.acceptInvite.useMutation({
    onSuccess: async (data) => {
      if (data?.tenantId) setActiveTenantId(data.tenantId);
      toast.success(t("toasts.saved"));
      router.replace("/(app)/today" as Href);
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const details = inviteQuery.data;
  const emailMismatch = Boolean(
    session?.user?.email &&
      details?.inviteEmail &&
      session.user.email.toLowerCase() !== details.inviteEmail.toLowerCase()
  );

  const inviteDetails =
    details?.status === "VALID"
      ? {
          status: "VALID" as const,
          householdName: details.householdName || "",
          inviteEmail: details.inviteEmail || "",
          accountStatus: "NEW" as const,
          emailMismatch,
        }
      : {
          status: (details?.status === "EXPIRED" || details?.status === "ALREADY_ACCEPTED"
            ? details.status
            : "INVALID") as "EXPIRED" | "ALREADY_ACCEPTED" | "INVALID",
          householdName: "",
          inviteEmail: "",
          emailMismatch: false as const,
        };

  return (
    <ScrollView
      contentContainerStyle={[
        styles.container,
        { paddingTop: Math.max(insets.top + 24, 48), paddingBottom: Math.max(insets.bottom + 24, 48) },
      ]}
    >
      <MobileInviteAcceptFlow
        inviteDetails={inviteDetails}
        isLoading={sessionPending || inviteQuery.isLoading}
        isAccepting={acceptMut.isPending}
        onAccept={async () => {
          if (!session?.user) {
            router.push(`/(auth)/sign-in` as Href);
            return;
          }
          await acceptMut.mutateAsync({ inviteToken: token });
        }}
        onSignOut={async () => {
          await authClient.signOut();
          await inviteQuery.refetch();
        }}
        onReturnHome={() => router.replace("/(auth)/sign-in" as Href)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 20, backgroundColor: DESIGN_TOKENS.colors.background },
});
