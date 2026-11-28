import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileScreenWrapper, useMobileToast } from "@kaesava/ui/mobile";
import { MobileArchivedItemsSection, type ArchivedItemsProps } from "@kaesava/capability-tenant/mobile";
import { authClient } from "../../../lib/auth";
import { trpc } from "../../../lib/trpc";

type ArchivedItem = ArchivedItemsProps["items"][number];

export default function ArchivedItemsScreen() {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const { data: session } = authClient.useSession();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const archivedQuery = trpc.listArchivedItems.useQuery(undefined, { enabled: !!session?.user });
  const restoreMut = trpc.restoreArchivedItem.useMutation({
    onSuccess: () => {
      utils.listArchivedItems.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
    onSettled: () => setRestoringId(null),
  });

  const handleRestore = async (item: ArchivedItem) => {
    setRestoringId(item.id);
    await restoreMut.mutateAsync({ itemType: item.itemType, id: item.id });
  };

  return (
    <MobileScreenWrapper
      title={t("settings.tabs.archived")}
      user={session?.user}
      showBack
      onBackPress={() => router.back()}
    >
      <View style={styles.container}>
        <MobileArchivedItemsSection
          items={(archivedQuery.data as ArchivedItem[]) || []}
          isLoading={archivedQuery.isLoading}
          isRestoringId={restoringId}
          onRestore={handleRestore}
        />
      </View>
    </MobileScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 40 },
});
