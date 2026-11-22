import React from "react";
import { ScrollView, View, StyleSheet } from "react-native";
import { SegmentedTabs, type SegmentTabItem } from "./SegmentedTabs";

export interface MobilePlatformSettingsShellProps<T extends string = string> {
  tabs: SegmentTabItem[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  children: React.ReactNode;
  footerSlot?: React.ReactNode;
}

/**
 * Generic tabbed Settings shell for Mobile matching Web's PlatformSettingsShell.
 */
export function MobilePlatformSettingsShell<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  children,
  footerSlot,
}: MobilePlatformSettingsShellProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <SegmentedTabs tabs={tabs} activeKey={activeTab} onChange={(k) => onTabChange(k as T)} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
        {footerSlot ? <View style={styles.footer}>{footerSlot}</View> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  tabs: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  content: { paddingBottom: 32 },
  footer: { marginTop: 24 },
});
