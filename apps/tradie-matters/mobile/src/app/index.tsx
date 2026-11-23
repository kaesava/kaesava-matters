import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileLogo } from "@kaesava/ui/mobile";

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <MobileLogo size={64} source={require("../../assets/icon.png")} />
      <Text style={styles.brand}>Tradie Matters</Text>
      <Text style={styles.title}>{t("nav.home")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F8FA",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  brand: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1B2B4B",
  },
});
