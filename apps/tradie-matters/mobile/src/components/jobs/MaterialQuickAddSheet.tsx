import React, { useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import { enqueueMutation, useOutboxSync } from "@kaesava/mobile-core";
import {
  ChipSelect,
  MobileAmountInput,
  MobileButton,
  MobileInput,
  MobileModalDialog,
  MobileSearchInput,
  SwitchRow,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface MaterialQuickAddSheetProps {
  visible: boolean;
  tenantId: string;
  userId: string;
  jobId: string;
  visitId?: string | null;
  onClose: () => void;
}

export function MaterialQuickAddSheet({
  visible,
  tenantId,
  userId,
  jobId,
  visitId,
  onClose,
}: MaterialQuickAddSheetProps) {
  const toast = useMobileToast();
  const { isOnline, syncNow } = useOutboxSync();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [description, setDescription] = useState("");
  const [qty, setQty] = useState("1.00");
  const [price, setPrice] = useState("0.00");
  const [isBillable, setIsBillable] = useState(true);

  const pbQuery = trpc.pricebook.fuzzySearch.useQuery({ query: search.trim(), limit: 10 }, { enabled: visible });
  const logMut = trpc.field.logMaterialUsage.useMutation({
    onSuccess: () => {
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.materialLoggedToast"));
      setDescription("");
      setSelectedId("");
      onClose();
    },
  });

  const options = (pbQuery.data ?? []).map((item) => ({ label: item.name, value: item.id }));

  const handleSelectPricebook = (id: string) => {
    setSelectedId(id);
    const match = pbQuery.data?.find((item) => item.id === id);
    if (match) {
      setDescription(match.name);
      setPrice(match.sellPriceExTax);
    }
  };

  const handleSave = async () => {
    const payload = {
      jobId,
      visitId: visitId ?? null,
      pricebookItemId: selectedId || null,
      description: description.trim(),
      quantity: qty || "1.00",
      unitSellPriceExTax: price || "0.00",
      taxCode: "GST" as const,
      isBillable,
    };
    if (!isOnline) {
      await enqueueMutation({ tenantId, userId, procedure: "field.logMaterialUsage", payload });
      toast.info(t("tradieMobile.queuedOfflineToast"));
      void syncNow();
      onClose();
      return;
    }
    logMut.mutate(payload);
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieJobs.logMaterialAction")}
      isDirty={Boolean(description.trim())}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          loading={logMut.isPending}
          disabled={!description.trim() || logMut.isPending}
          onPress={() => void handleSave()}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileSearchInput value={search} onChangeText={setSearch} placeholder={t("tradieCrm.pricebookTitle")} />
        {options.length > 0 ? <ChipSelect value={selectedId} onChange={handleSelectPricebook} options={options} /> : null}
        <MobileInput label={t("tradieMobile.materialDescLabel")} value={description} onChangeText={setDescription} />
        <MobileInput label={t("tradieMobile.quantityLabel")} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        <MobileAmountInput label={t("tradieMobile.unitSellPriceLabel")} value={price} onChangeText={setPrice} />
        <SwitchRow label={t("tradieMobile.materialBillableLabel")} value={isBillable} onValueChange={setIsBillable} />
      </View>
    </MobileModalDialog>
  );
}
