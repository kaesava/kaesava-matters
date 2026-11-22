import React from "react";
import { View, StyleSheet } from "react-native";
import { MobileLinkButton } from "./MobileLinkButton";

export interface MobileLegalLinksProps {
  privacyUrl: string;
  termsUrl: string;
  privacyLabel: string;
  termsLabel: string;
  onOpenUrl: (url: string) => void;
}

/**
 * Touch-native Privacy Policy & Terms of Use links parameterized by AppManifest URLs.
 */
export function MobileLegalLinks({
  privacyUrl,
  termsUrl,
  privacyLabel,
  termsLabel,
  onOpenUrl,
}: MobileLegalLinksProps) {
  return (
    <View style={styles.row}>
      <MobileLinkButton label={privacyLabel} onPress={() => onOpenUrl(privacyUrl)} />
      <MobileLinkButton label={termsLabel} onPress={() => onOpenUrl(termsUrl)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 16 },
});
