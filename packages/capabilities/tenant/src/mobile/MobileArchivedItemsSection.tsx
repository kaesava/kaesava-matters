import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { ArchivedItemsProps } from "../ui-contracts.js";

export function MobileArchivedItemsSection({
  items,
  isLoading = false,
  isRestoringId = null,
  onRestore,
}: ArchivedItemsProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("settings.tabs.archived")}</Text>
      {isLoading ? (
        <ActivityIndicator />
      ) : items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>{t("settings.archived.emptyTitle")}</Text>
          <Text style={styles.emptySubtitle}>{t("settings.archived.emptySubtitle")}</Text>
        </View>
      ) : (
        items.map((item) => (
          <View key={item.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.sub}>{item.subtitle || item.itemType}</Text>
            </View>
            <TouchableOpacity
              style={styles.restoreBtn}
              disabled={isRestoringId === item.id}
              onPress={() => onRestore(item)}
              accessibilityRole="button"
            >
              <Text style={styles.restoreText}>
                {isRestoringId === item.id ? t("common.loading") : t("settings.archived.restoreAction")}
              </Text>
            </TouchableOpacity>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 8 },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  emptyBox: { paddingVertical: 16, alignItems: "center", gap: 4 },
  emptyTitle: { fontSize: 14, fontWeight: "500", color: "#334155" },
  emptySubtitle: { fontSize: 12, color: "#64748b", textAlign: "center" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  sub: { fontSize: 12, color: "#64748b" },
  restoreBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: "#cbd5e1" },
  restoreText: { fontSize: 12, fontWeight: "600", color: "#0f172a" },
});
