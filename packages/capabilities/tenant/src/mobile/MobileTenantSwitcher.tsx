import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { TenantSwitcherProps } from "../ui-contracts.js";

export function MobileTenantSwitcher({
  tenants,
  activeTenantId,
  onSwitchTenant,
}: TenantSwitcherProps) {
  if (tenants.length <= 1) return null;

  return (
    <View style={styles.container}>
      {tenants.map((tenant) => {
        const isActive = tenant.id === activeTenantId;
        return (
          <TouchableOpacity
            key={tenant.id}
            style={[styles.chip, isActive ? styles.chipActive : styles.chipIdle]}
            onPress={() => onSwitchTenant(tenant.id)}
            accessibilityRole="button"
          >
            <Text style={[styles.chipText, isActive ? styles.textActive : styles.textIdle]}>{tenant.name}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipIdle: { backgroundColor: "#ffffff", borderColor: "#cbd5e1" },
  chipText: { fontSize: 13, fontWeight: "600" },
  textActive: { color: "#ffffff" },
  textIdle: { color: "#0f172a" },
});
