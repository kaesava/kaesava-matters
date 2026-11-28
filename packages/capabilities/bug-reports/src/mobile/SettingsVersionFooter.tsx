import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { DESIGN_TOKENS, PLATFORM_STYLE } from "@kaesava/ui/mobile";

export interface SettingsVersionFooterProps {
  appName: string;
  formattedVersion: string;
  channel?: string;
  onCopyDiagnostics: () => void;
}

export function SettingsVersionFooter({
  appName,
  formattedVersion,
  channel,
  onCopyDiagnostics,
}: SettingsVersionFooterProps) {
  return (
    <TouchableOpacity
      onPress={onCopyDiagnostics}
      activeOpacity={0.7}
      style={styles.versionFooter}
      accessibilityRole="button"
    >
      <Text style={styles.versionText}>
        {channel ? `${appName} ${formattedVersion} • ${channel}` : `${appName} ${formattedVersion}`}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  versionFooter: {
    minHeight: PLATFORM_STYLE.minTouch,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  versionText: {
    fontSize: 12,
    fontWeight: "500",
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
