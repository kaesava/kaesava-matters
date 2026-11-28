import React from "react";
import { StyleSheet, View } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileModalDialog } from "./MobileModalDialog";
import { ReadOnlyField } from "./ReadOnlyField";
import type { MobileActivityItem } from "./MobileActivityHistoryList";

export interface MobileActivityDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  item: MobileActivityItem | null;
  title?: string;
  formatTimestamp?: (iso: string) => string;
  labels?: {
    actor?: string;
    action?: string;
    target?: string;
    timestamp?: string;
  };
}

export function MobileActivityDetailSheet({
  visible,
  onClose,
  item,
  title,
  formatTimestamp = (iso) => iso,
  labels,
}: MobileActivityDetailSheetProps) {
  if (!item) return null;

  const metadataEntries = item.metadata ? Object.entries(item.metadata) : [];

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={title ?? t("settings.workspace.dataExport.activityTitle")}
    >
      <View style={styles.body}>
        <ReadOnlyField
          label={labels?.actor ?? t("settings.workspace.dataExport.activityActor")}
          value={item.actorName}
        />
        <ReadOnlyField
          label={labels?.action ?? t("settings.workspace.dataExport.activityAction")}
          value={item.action}
        />
        <ReadOnlyField
          label={labels?.target ?? t("settings.workspace.dataExport.activityTarget")}
          value={item.summary || item.target}
        />
        <ReadOnlyField
          label={labels?.timestamp ?? t("settings.workspace.dataExport.activityTimestamp")}
          value={formatTimestamp(item.timestamp)}
        />
        {metadataEntries.map(([key, val]) => (
          <ReadOnlyField
            key={key}
            label={key}
            value={val !== null && val !== undefined ? String(val) : undefined}
          />
        ))}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 16,
  },
});
