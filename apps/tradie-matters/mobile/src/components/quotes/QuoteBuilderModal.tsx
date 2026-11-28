import React, { useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import type { QuoteLineInputType } from "@tradie-matters/capability-operations";
import {
  ChipSelect,
  MobileButton,
  MobileFormLabel,
  MobileInput,
  MobileModalDialog,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";
import { PricebookPickerModal } from "./PricebookPickerModal";
import { QuoteLineEditor } from "./QuoteLineEditor";

interface QuoteBuilderModalProps {
  visible: boolean;
  initialJobId?: string;
  initialCustomerId?: string;
  onClose: () => void;
}

export function QuoteBuilderModal({ visible, initialJobId, initialCustomerId, onClose }: QuoteBuilderModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState(initialCustomerId ?? "");
  const [activeGroup, setActiveGroup] = useState<"GOOD" | "BETTER" | "BEST">("GOOD");
  const [lines, setLines] = useState<QuoteLineInputType[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);

  const customersQuery = trpc.customers.list.useQuery({ limit: 30 }, { enabled: visible });
  const createMut = trpc.quotes.create.useMutation({
    onSuccess: () => {
      void utils.quotes.invalidate();
      toast.success(t("tradieMobile.quoteCreatedToast"));
      setTitle("");
      setLines([]);
      onClose();
    },
  });

  const usedKeys = new Set(lines.map((l) => l.optionGroupKey));
  const groups = (["GOOD", "BETTER", "BEST"] as const)
    .filter((k) => usedKeys.has(k))
    .map((key, idx) => ({
      key,
      name: key === "GOOD" ? t("tradieMobile.optionGood") : key === "BETTER" ? t("tradieMobile.optionBetter") : t("tradieMobile.optionBest"),
      isRecommended: key === "BETTER",
      isSelected: false,
      sortOrder: idx,
    }));

  const handleSave = () => {
    createMut.mutate({
      title: title.trim(),
      customerId,
      jobId: initialJobId ?? null,
      gstMode: "EXCLUSIVE",
      depositType: "NONE",
      depositValue: 0,
      optionGroups: groups,
      lines,
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieQuotes.newQuote")}
      isDirty={Boolean(title.trim() || lines.length > 0)}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          loading={createMut.isPending}
          disabled={!title.trim() || !customerId || lines.length === 0 || createMut.isPending}
          onPress={handleSave}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieMobile.quoteTitleLabel")} placeholder={t("tradieMobile.quoteTitlePlaceholder")} value={title} onChangeText={setTitle} />
        <MobileFormLabel label={t("tradieMobile.selectCustomerLabel")} />
        <ChipSelect value={customerId} onChange={setCustomerId} options={(customersQuery.data ?? []).map((c) => ({ label: c.name, value: c.id }))} />
        <MobileFormLabel label={t("tradieQuotes.goodBetterBest")} />
        <ChipSelect
          value={activeGroup}
          onChange={(v) => setActiveGroup(v as "GOOD" | "BETTER" | "BEST")}
          options={[
            { label: t("tradieMobile.optionGood"), value: "GOOD" },
            { label: t("tradieMobile.optionBetter"), value: "BETTER" },
            { label: t("tradieMobile.optionBest"), value: "BEST" },
          ]}
        />
        <QuoteLineEditor
          lines={lines}
          activeGroupKey={activeGroup}
          onOpenPricebook={() => setPickerOpen(true)}
          onAddManual={() => setLines((prev) => [...prev, { optionGroupKey: activeGroup, description: "", quantity: 1, unitCostExTax: 0, unitSellPrice: 0, taxCode: "GST", sortOrder: prev.length }])}
          onUpdateLine={(i, patch) => setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))}
          onRemoveLine={(i) => setLines((prev) => prev.filter((_, idx) => idx !== i))}
        />
      </View>
      <PricebookPickerModal
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(item) => setLines((prev) => [...prev, { optionGroupKey: activeGroup, pricebookItemId: item.id, description: item.name, quantity: 1, unitCostExTax: Number(item.unitCostExTax) || 0, unitSellPrice: Number(item.sellPriceExTax) || 0, taxCode: item.taxCode === "GST_FREE" ? "GST_FREE" : "GST", sortOrder: prev.length }])}
      />
    </MobileModalDialog>
  );
}
