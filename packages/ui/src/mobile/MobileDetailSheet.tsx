import React from "react";
import { StyleSheet, View } from "react-native";
import { MobileModalDialog } from "./MobileModalDialog";

export interface MobileDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  headerBadge?: React.ReactNode;
  footer?: React.ReactNode;
  isDirty?: boolean;
  children: React.ReactNode;
}

export function MobileDetailSheet({
  visible,
  onClose,
  title,
  subtitle,
  headerBadge,
  footer,
  isDirty = false,
  children,
}: MobileDetailSheetProps) {
  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      isDirty={isDirty}
      footer={footer}
    >
      <View style={styles.body}>
        {headerBadge ? <View style={styles.badgeWrap}>{headerBadge}</View> : null}
        {children}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingBottom: 16,
    gap: 12,
  },
  badgeWrap: {
    alignItems: "flex-start",
  },
});

export default MobileDetailSheet;
