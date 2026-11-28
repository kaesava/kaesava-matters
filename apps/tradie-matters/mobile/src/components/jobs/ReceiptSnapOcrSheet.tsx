import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import { DESIGN_TOKENS, MobileButton, MobileInput, MobileModalDialog } from "@kaesava/ui/mobile";
import { useReceiptOcrCapture } from "./useReceiptOcrCapture";

interface ReceiptSnapOcrSheetProps {
  visible: boolean;
  jobId: string;
  onClose: () => void;
}

export function ReceiptSnapOcrSheet({ visible, jobId, onClose }: ReceiptSnapOcrSheetProps) {
  const { form, setField, scanning, saving, receiptFileNoteId, pickReceipt, saveBill, reset } =
    useReceiptOcrCapture(jobId, onClose);

  const handleClose = () => {
    reset();
    onClose();
  };

  const isDirty = Boolean(receiptFileNoteId || form.supplierName.trim());

  return (
    <MobileModalDialog
      visible={visible}
      onClose={handleClose}
      title={t("tradieMobile.receiptOcrTitle")}
      isDirty={isDirty}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          loading={saving}
          disabled={scanning || saving || !form.supplierName.trim()}
          onPress={() => void saveBill()}
        />
      }
    >
      <View style={styles.container}>
        <View style={styles.btnRow}>
          <MobileButton title={t("tradieMobile.pickCameraAction")} variant="secondary" onPress={() => void pickReceipt(true)} />
          <MobileButton title={t("tradieMobile.pickLibraryAction")} variant="secondary" onPress={() => void pickReceipt(false)} />
        </View>
        {scanning ? <Text style={styles.status}>{t("tradieMobile.receiptScanningLabel")}</Text> : null}
        <MobileInput label={t("tradieMobile.supplierNameLabel")} value={form.supplierName} onChangeText={(v) => setField("supplierName", v)} />
        <MobileInput label={t("tradieMobile.supplierAbnLabel")} value={form.supplierAbn} onChangeText={(v) => setField("supplierAbn", v)} />
        <MobileInput label={t("tradieMobile.issueDateLabel")} value={form.issueDate} onChangeText={(v) => setField("issueDate", v)} />
        <View style={styles.row}>
          <View style={styles.half}>
            <MobileInput label={t("tradieMobile.subtotalExTaxLabel")} keyboardType="decimal-pad" value={form.subtotalExTax} onChangeText={(v) => setField("subtotalExTax", v)} />
          </View>
          <View style={styles.half}>
            <MobileInput label={t("tradieMobile.taxAmountLabel")} keyboardType="decimal-pad" value={form.taxAmount} onChangeText={(v) => setField("taxAmount", v)} />
          </View>
        </View>
        <View style={styles.row}>
          <View style={styles.half}>
            <MobileInput label={t("tradieMobile.totalIncTaxLabel")} keyboardType="decimal-pad" value={form.totalIncTax} onChangeText={(v) => setField("totalIncTax", v)} />
          </View>
          <View style={styles.half}>
            <MobileInput label={t("tradieMobile.markupPctLabel")} keyboardType="decimal-pad" value={form.markupPct} onChangeText={(v) => setField("markupPct", v)} />
          </View>
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  btnRow: { flexDirection: "row", gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  half: { flex: 1 },
  status: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.accent },
});