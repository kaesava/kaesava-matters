import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import type { QuoteLineInputType } from "@tradie-matters/capability-operations";
import {
  DESIGN_TOKENS,
  MobileAmountInput,
  MobileButton,
  MobileInput,
} from "@kaesava/ui/mobile";

interface QuoteLineEditorProps {
  lines: QuoteLineInputType[];
  activeGroupKey: string;
  onAddManual: () => void;
  onOpenPricebook: () => void;
  onUpdateLine: (index: number, patch: Partial<QuoteLineInputType>) => void;
  onRemoveLine: (index: number) => void;
}

export function QuoteLineEditor({
  lines,
  activeGroupKey,
  onAddManual,
  onOpenPricebook,
  onUpdateLine,
  onRemoveLine,
}: QuoteLineEditorProps) {
  const visible = lines
    .map((line, idx) => ({ line, idx }))
    .filter(({ line }) => line.optionGroupKey === activeGroupKey);

  return (
    <View style={styles.container}>
      <View style={styles.actions}>
        <MobileButton title={t("tradieMobile.pickFromPricebookAction")} onPress={onOpenPricebook} />
        <MobileButton title={t("tradieMobile.addLineAction")} variant="secondary" onPress={onAddManual} />
      </View>
      {visible.map(({ line, idx }) => (
        <View key={`${activeGroupKey}-${idx}`} style={styles.card}>
          <MobileInput
            label={t("tradieMobile.lineDescriptionLabel")}
            value={line.description}
            onChangeText={(v) => onUpdateLine(idx, { description: v })}
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <MobileInput
                label={t("tradieMobile.quantityLabel")}
                value={String(line.quantity)}
                keyboardType="decimal-pad"
                onChangeText={(v) => {
                  const cleaned = v.replace(/[^0-9.]/g, "");
                  const parsed = parseFloat(cleaned);
                  onUpdateLine(idx, { quantity: Number.isFinite(parsed) && parsed > 0 ? parsed : 1 });
                }}
              />
            </View>
            <View style={styles.half}>
              <MobileAmountInput
                label={t("tradieMobile.unitSellPriceLabel")}
                value={String(line.unitSellPrice)}
                onChangeText={(v) => onUpdateLine(idx, { unitSellPrice: Number(v) || 0 })}
              />
            </View>
          </View>
          <MobileButton title={t("common.remove")} variant="secondary" onPress={() => onRemoveLine(idx)} />
        </View>
      ))}
      {visible.length === 0 ? <Text style={styles.empty}>{t("common.emptySubtitle")}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  actions: { gap: 8 },
  card: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: DESIGN_TOKENS.colors.slate[200],
    gap: 8,
  },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  empty: { fontSize: 13, color: DESIGN_TOKENS.colors.textMuted },
});
