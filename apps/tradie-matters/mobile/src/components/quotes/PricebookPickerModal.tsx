import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileCardRow,
  MobileModalDialog,
  MobileSearchInput,
  MobileSkeletonCard,
} from "@kaesava/ui/mobile";
import { formatMobileCurrency } from "../../lib/format";
import { trpc } from "../../lib/trpc";
import type { PricebookItemDto } from "../../lib/trpc-types";

interface PricebookPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: PricebookItemDto) => void;
}

export function PricebookPickerModal({ visible, onClose, onSelect }: PricebookPickerModalProps) {
  const [query, setQuery] = useState("");
  const pbQuery = trpc.pricebook.fuzzySearch.useQuery(
    { query: query.trim() || undefined, limit: 20 },
    { enabled: visible }
  );
  const items = pbQuery.data ?? [];

  return (
    <MobileModalDialog visible={visible} onClose={onClose} title={t("tradieMobile.pickFromPricebookAction")}>
      <View style={styles.container}>
        <MobileSearchInput value={query} onChangeText={setQuery} placeholder={t("common.searchPlaceholder")} />
        {pbQuery.isLoading ? (
          <MobileSkeletonCard count={3} height={56} />
        ) : items.length === 0 ? (
          <Text style={styles.empty}>{t("tradieMobile.emptyPricebook")}</Text>
        ) : (
          items.map((item) => (
            <MobileCardRow
              key={item.id}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
            >
              <Text style={styles.title}>{item.name}</Text>
              <Text style={styles.sub}>{`${item.itemType} · ${formatMobileCurrency(item.sellPriceExTax)}`}</Text>
            </MobileCardRow>
          ))
        )}
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
  title: { fontSize: 15, fontWeight: "600", color: DESIGN_TOKENS.colors.textPrimary },
  sub: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
