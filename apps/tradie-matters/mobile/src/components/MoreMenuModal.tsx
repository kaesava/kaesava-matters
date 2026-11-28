import React from "react";
import { StyleSheet, View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import { MobileDetailLinkRow, MobileModalDialog } from "@kaesava/ui/mobile";
import { trpc } from "../lib/trpc";

interface MoreMenuModalProps {
  visible: boolean;
  onClose: () => void;
}

export function MoreMenuModal({ visible, onClose }: MoreMenuModalProps) {
  const router = useRouter();
  const governanceQuery = trpc.getGovernanceInfo.useQuery(undefined, { enabled: visible });
  const role = governanceQuery.data?.userRole ?? "TRADIE";
  const flags = (governanceQuery.data?.effectiveFlags ?? {}) as Record<string, boolean>;
  const isOwnerOrAdmin = role === "OWNER" || role === "ADMIN";

  const navigateTo = (path: string) => {
    onClose();
    router.push(path as Href);
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieMobile.moreHubTitle")}
    >
      <View style={styles.list}>
        <MobileDetailLinkRow
          label={t("tradieJobs.scheduleVisitAction")}
          value=""
          onPress={() => navigateTo("/(app)/schedule")}
        />
        {flags.quotesEnabled !== false ? (
          <MobileDetailLinkRow
            label={t("tradieQuotes.quotesTitle")}
            value=""
            onPress={() => navigateTo("/(app)/quotes")}
          />
        ) : null}
        {flags.invoicingEnabled !== false && isOwnerOrAdmin ? (
          <MobileDetailLinkRow
            label={t("tradieInvoices.invoicesTitle")}
            value=""
            onPress={() => navigateTo("/(app)/invoices")}
          />
        ) : null}
        <MobileDetailLinkRow
          label={t("tradieMobile.timesheetsTitle")}
          value=""
          onPress={() => navigateTo("/(app)/timesheets")}
        />
        {isOwnerOrAdmin ? (
          <MobileDetailLinkRow
            label={t("tradieMobile.suppliersTitle")}
            value=""
            onPress={() => navigateTo("/(app)/suppliers")}
          />
        ) : null}
        <MobileDetailLinkRow
          label={t("tradieMobile.activityTitle")}
          value=""
          onPress={() => navigateTo("/(app)/activity")}
        />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  list: { gap: 4 },
});
