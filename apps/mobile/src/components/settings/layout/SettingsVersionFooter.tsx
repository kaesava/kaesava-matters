import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DESIGN_TOKENS } from '@kaesava/ui/mobile';
import { getMobileVersionInfo } from '../../../lib/version';

interface SettingsVersionFooterProps {
  onCopyDiagnostics: () => void;
}

export function SettingsVersionFooter({
  onCopyDiagnostics,
}: SettingsVersionFooterProps) {
  const versionInfo = getMobileVersionInfo();

  return (
    <TouchableOpacity
      onPress={onCopyDiagnostics}
      activeOpacity={0.7}
      style={styles.versionFooter}
      accessibilityRole="button"
    >
      <Text style={styles.versionText}>
        Money Matters {versionInfo.formattedVersion} • {versionInfo.channel} channel
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  versionFooter: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    fontWeight: '500',
    color: DESIGN_TOKENS.colors.slate[500],
  },
});
