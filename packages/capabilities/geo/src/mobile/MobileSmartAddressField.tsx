import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileFormLabel,
  MobileLinkButton,
  MobileSearchInput,
  PLATFORM_STYLE,
  getRipple,
} from "@kaesava/ui/mobile";
import { useAddressLookup } from "../shared/useAddressLookup.js";
import type { AddressValue, SearchAddressesResult } from "../types.js";
import { MobileManualAddressInputs } from "./MobileManualAddressInputs.js";

export interface MobileSmartAddressFieldProps {
  label?: string;
  value: AddressValue;
  onChange: (next: AddressValue) => void;
  onSearch: (query: string) => Promise<SearchAddressesResult>;
  disabled?: boolean;
  required?: boolean;
}

export function MobileSmartAddressField({
  label,
  value,
  onChange,
  onSearch,
  disabled,
  required,
}: MobileSmartAddressFieldProps) {
  const initialQuery = [value.streetLine, value.suburb, value.state, value.postcode].filter(Boolean).join(", ");
  const { query, setQuery, suggestions, isSearching, manualMode, timedOut, hasSearched, handleSelectSuggestion, toggleManualMode } =
    useAddressLookup({ initialQuery, onSearch, onSelect: onChange });

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <MobileFormLabel label={label ?? t("geo.addressLabel")} required={required} />
        <MobileLinkButton
          label={manualMode ? t("geo.searchModeAction") : t("geo.manualEntryAction")}
          onPress={toggleManualMode}
          disabled={disabled}
          showChevron={false}
        />
      </View>
      {timedOut ? (
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>{t("geo.fallbackNotice")}</Text>
        </View>
      ) : null}
      {manualMode ? (
        <MobileManualAddressInputs value={value} onChange={onChange} editable={!disabled} />
      ) : (
        <View>
          <MobileSearchInput value={query} onChangeText={setQuery} placeholder={t("geo.searchPlaceholder")} />
          {isSearching ? <Text style={styles.statusText}>{t("geo.searching")}</Text> : null}
          {!isSearching && hasSearched && suggestions.length === 0 ? <Text style={styles.statusText}>{t("geo.noResults")}</Text> : null}
          {suggestions.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => handleSelectSuggestion(s)}
              android_ripple={getRipple()}
              accessibilityRole="button"
              style={styles.suggestionRow}
            >
              <Text style={styles.suggestionText} numberOfLines={2}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  noticeBox: { backgroundColor: DESIGN_TOKENS.colors.warningLight, borderColor: DESIGN_TOKENS.colors.warningBorder, borderWidth: 1, borderRadius: 10, padding: 10 },
  noticeText: { fontSize: 12, color: DESIGN_TOKENS.colors.warningDark },
  statusText: { marginTop: 6, fontSize: 12, color: DESIGN_TOKENS.colors.textMuted },
  suggestionRow: { minHeight: PLATFORM_STYLE.minTouch, justifyContent: "center", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: DESIGN_TOKENS.colors.border, backgroundColor: DESIGN_TOKENS.colors.surface },
  suggestionText: { fontSize: 14, color: DESIGN_TOKENS.colors.textPrimary },
});
