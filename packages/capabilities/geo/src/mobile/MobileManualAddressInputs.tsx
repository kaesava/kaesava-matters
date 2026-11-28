import React from "react";
import { View, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileInput } from "@kaesava/ui/mobile";
import type { AddressValue } from "../types.js";

export interface MobileManualAddressInputsProps {
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  editable?: boolean;
}

export function MobileManualAddressInputs({
  value,
  onChange,
  editable = true,
}: MobileManualAddressInputsProps) {
  const update = (field: keyof AddressValue) => (text: string) => {
    onChange({ ...value, [field]: text, lat: undefined, lng: undefined });
  };

  return (
    <View style={styles.stack}>
      <MobileInput
        label={t("geo.streetLabel")}
        placeholder={t("geo.streetPlaceholder")}
        value={value.streetLine}
        onChangeText={update("streetLine")}
        editable={editable}
      />
      <View style={styles.row}>
        <View style={styles.half}>
          <MobileInput
            label={t("geo.suburbLabel")}
            placeholder={t("geo.suburbPlaceholder")}
            value={value.suburb}
            onChangeText={update("suburb")}
            editable={editable}
          />
        </View>
        <View style={styles.half}>
          <MobileInput
            label={t("geo.stateLabel")}
            placeholder={t("geo.statePlaceholder")}
            value={value.state}
            onChangeText={update("state")}
            editable={editable}
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.half}>
          <MobileInput
            label={t("geo.postcodeLabel")}
            placeholder={t("geo.postcodePlaceholder")}
            value={value.postcode}
            onChangeText={update("postcode")}
            editable={editable}
          />
        </View>
        <View style={styles.half}>
          <MobileInput
            label={t("geo.countryLabel")}
            placeholder={t("geo.countryPlaceholder")}
            value={value.country}
            onChangeText={update("country")}
            editable={editable}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 10 },
  row: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
});
