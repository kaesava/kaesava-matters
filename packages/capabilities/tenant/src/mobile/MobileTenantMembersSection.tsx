import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import type { TenantMembersProps } from "../ui-contracts.js";

export interface MobileTenantMembersProps extends Omit<TenantMembersProps, "onInvite"> {
  onPressInvite?: () => void;
}

export function MobileTenantMembersSection({
  members,
  currentUserId,
  isOwner,
  onPressInvite,
  onRemoveMember,
}: MobileTenantMembersProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t("settings.members.title")}</Text>
      {members.length === 0 ? (
        <Text style={styles.empty}>{t("settings.members.noMembers")}</Text>
      ) : (
        members.map((m) => (
          <View key={m.id} style={styles.row}>
            <View style={styles.info}>
              <Text style={styles.name}>{m.name}</Text>
              <Text style={styles.email}>{m.email}</Text>
            </View>
            <View style={styles.actions}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{m.appRole ?? (m.isOwner ? t("settings.members.roleOwner") : t("settings.members.roleMember"))}</Text>
              </View>
              {isOwner && onRemoveMember && m.userId !== currentUserId && (
                <TouchableOpacity style={styles.removeBtn} onPress={() => onRemoveMember(m.id)} accessibilityRole="button">
                  <Text style={styles.removeText}>{t("settings.members.removeAction")}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))
      )}
      {isOwner && onPressInvite && (
        <TouchableOpacity style={styles.inviteBtn} onPress={onPressInvite} accessibilityRole="button">
          <Text style={styles.inviteText}>{t("settings.addMemberTitle")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e2e8f0", gap: 8 },
  title: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  empty: { fontSize: 13, color: "#64748b" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#f1f5f9" },
  info: { flex: 1, paddingRight: 8 },
  name: { fontSize: 14, fontWeight: "500", color: "#0f172a" },
  email: { fontSize: 12, color: "#64748b" },
  actions: { flexDirection: "row", alignItems: "center", gap: 8 },
  badge: { backgroundColor: "#f1f5f9", borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#334155" },
  removeBtn: { minHeight: 44, justifyContent: "center", paddingHorizontal: 8 },
  removeText: { fontSize: 12, fontWeight: "600", color: "#dc2626" },
  inviteBtn: { marginTop: 8, minHeight: 44, borderRadius: 8, backgroundColor: "#2563eb", alignItems: "center", justifyContent: "center" },
  inviteText: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
});
