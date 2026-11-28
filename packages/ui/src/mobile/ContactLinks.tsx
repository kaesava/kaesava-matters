import React from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS } from "../tokens";
import { PLATFORM_STYLE, getRipple } from "./platform-style";

interface BaseProps { label?: string; onCopy?: (value: string, copiedLabel: string) => void; }
export interface PhoneActionLinkProps extends BaseProps { phone: string; }
export interface EmailActionLinkProps extends BaseProps { email: string; }
export interface AddressMapActionLinkProps extends BaseProps { address: string; }

function ContactRow({
  icon, text, accessibilityLabel, onPress, onCopy,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  accessibilityLabel: string;
  onPress: () => void;
  onCopy?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} android_ripple={getRipple()} accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.actionBtn}>
        <Feather name={icon} size={16} color={DESIGN_TOKENS.colors.accent} />
        <Text style={styles.actionText} numberOfLines={2}>{text}</Text>
      </Pressable>
      {onCopy ? (
        <Pressable onPress={onCopy} android_ripple={getRipple()} accessibilityRole="button" accessibilityLabel={t("contactLinks.copied")} style={styles.copyBtn}>
          <Feather name="copy" size={16} color={DESIGN_TOKENS.colors.textMuted} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function PhoneActionLink({ phone, label, onCopy }: PhoneActionLinkProps) {
  const sanitized = phone.replace(/[^\d+]/g, "");
  return (
    <ContactRow
      icon="phone"
      text={label ?? phone}
      accessibilityLabel={t("contactLinks.call")}
      onPress={() => void Linking.openURL(`tel:${sanitized}`)}
      onCopy={onCopy ? () => onCopy(phone, t("contactLinks.copied")) : undefined}
    />
  );
}

export function EmailActionLink({ email, label, onCopy }: EmailActionLinkProps) {
  return (
    <ContactRow
      icon="mail"
      text={label ?? email}
      accessibilityLabel={t("contactLinks.email")}
      onPress={() => void Linking.openURL(`mailto:${email}`)}
      onCopy={onCopy ? () => onCopy(email, t("contactLinks.copied")) : undefined}
    />
  );
}

export function AddressMapActionLink({ address, label, onCopy }: AddressMapActionLinkProps) {
  return (
    <ContactRow
      icon="map-pin"
      text={label ?? address}
      accessibilityLabel={t("contactLinks.openMap")}
      onPress={() => void Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(address)}`)}
      onCopy={onCopy ? () => onCopy(address, t("contactLinks.copied")) : undefined}
    />
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionBtn: { flex: 1, minHeight: PLATFORM_STYLE.minTouch, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderRadius: 10 },
  actionText: { fontSize: 13, fontWeight: "600", color: DESIGN_TOKENS.colors.accent, flexShrink: 1 },
  copyBtn: { minHeight: PLATFORM_STYLE.minTouch, minWidth: PLATFORM_STYLE.minTouch, alignItems: "center", justifyContent: "center", borderRadius: 10 },
});
