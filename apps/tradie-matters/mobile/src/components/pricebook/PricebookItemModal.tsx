import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  MobileAmountInput,
  MobileButton,
  MobileInput,
  MobileModalDialog,
  SwitchRow,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export interface PricebookItemInitial {
  id: string;
  sku?: string | null;
  name: string;
  unitCostExTax?: string | null;
  sellPriceExTax?: string | null;
  supplierName?: string | null;
  isFavourite?: boolean;
}

interface PricebookItemModalProps {
  visible: boolean;
  onClose: () => void;
  initial?: PricebookItemInitial | null;
}

export function PricebookItemModal({ visible, onClose, initial }: PricebookItemModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unitCost, setUnitCost] = useState("0.00");
  const [sellPrice, setSellPrice] = useState("0.00");
  const [supplier, setSupplier] = useState("");
  const [isFavourite, setIsFavourite] = useState(false);

  useEffect(() => {
    setName(initial?.name ?? "");
    setSku(initial?.sku ?? "");
    setUnitCost(initial?.unitCostExTax ?? "0.00");
    setSellPrice(initial?.sellPriceExTax ?? "0.00");
    setSupplier(initial?.supplierName ?? "");
    setIsFavourite(Boolean(initial?.isFavourite));
  }, [initial, visible]);

  const createMut = trpc.pricebook.create.useMutation({
    onSuccess: () => {
      void utils.pricebook.invalidate();
      toast.success(t("tradieMobile.pricebookSavedToast"));
      onClose();
    },
  });
  const updateMut = trpc.pricebook.update.useMutation({
    onSuccess: () => {
      void utils.pricebook.invalidate();
      toast.success(t("tradieMobile.pricebookSavedToast"));
      onClose();
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const handleSave = () => {
    const payload = {
      name: name.trim(),
      sku: sku.trim() || null,
      itemType: "MATERIAL" as const,
      unitOfMeasure: "EACH",
      unitCostExTax: unitCost || "0.00",
      markupPct: "0.00",
      sellPriceExTax: sellPrice || "0.00",
      taxCode: "GST" as const,
      supplierName: supplier.trim() || null,
      isFavourite,
    };
    if (initial?.id) updateMut.mutate({ id: initial.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieCrm.addPricebookItemAction")}
      isDirty={name.trim().length > 0 && name !== (initial?.name ?? "")}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          onPress={handleSave}
          loading={isPending}
          disabled={!name.trim() || isPending}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieCrm.pricebookTitle")} value={name} onChangeText={setName} />
        <MobileInput label={t("tradieCrm.skuLabel")} value={sku} onChangeText={setSku} />
        <MobileAmountInput label={t("tradieCrm.unitCostLabel")} value={unitCost} onChangeText={setUnitCost} />
        <MobileAmountInput label={t("tradieCrm.sellPriceLabel")} value={sellPrice} onChangeText={setSellPrice} />
        <MobileInput label={t("tradieCrm.supplierNameLabel")} value={supplier} onChangeText={setSupplier} />
        <SwitchRow label={t("tradieCrm.favouriteLabel")} value={isFavourite} onValueChange={setIsFavourite} />
      </View>
    </MobileModalDialog>
  );
}
