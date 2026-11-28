import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import { useOfflineDraftAutoSave } from "@kaesava/mobile-core";
import {
  MobileAmountInput,
  MobileButton,
  MobileFormLabel,
  MobileInput,
  MobileModalDialog,
  MobileSignaturePad,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { getActiveTenantId, trpc } from "../../lib/trpc";

interface VariationCaptureSheetProps {
  visible: boolean;
  jobId: string;
  onClose: () => void;
}

export function VariationCaptureSheet({ visible, jobId, onClose }: VariationCaptureSheetProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [lineDesc, setLineDesc] = useState("");
  const [qty, setQty] = useState("1.00");
  const [price, setPrice] = useState("0.00");
  const [approvedBy, setApprovedBy] = useState("");
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);

  const { loadDraft, clearDraft } = useOfflineDraftAutoSave({
    tenantId: getActiveTenantId() ?? "",
    userId: "",
    draftKey: `variation-draft:${jobId}`,
    value: { title, lineDesc, qty, price },
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) return;
    void loadDraft().then((draft) => {
      if (draft?.title) setTitle(draft.title);
      if (draft?.lineDesc) setLineDesc(draft.lineDesc);
      if (draft?.qty) setQty(draft.qty);
      if (draft?.price) setPrice(draft.price);
    });
  }, [visible, loadDraft]);

  const approveMut = trpc.field.approveVariation.useMutation({
    onError: (err) => toast.error(err.message),
  });
  const createMut = trpc.field.createVariation.useMutation({
    onSuccess: async (variation) => {
      if (approvedBy.trim() && signaturePaths.length > 0 && variation?.id) {
        await approveMut.mutateAsync({ variationId: variation.id, approvedByName: approvedBy.trim() });
      }
      await clearDraft();
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.variationCreatedToast"));
      setTitle("");
      setLineDesc("");
      setApprovedBy("");
      setSignaturePaths([]);
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const isPending = createMut.isPending || approveMut.isPending;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieJobs.createVariationAction")}
      isDirty={Boolean(title.trim() || lineDesc.trim())}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          loading={isPending}
          disabled={!title.trim() || !lineDesc.trim() || isPending}
          onPress={() =>
            createMut.mutate({
              jobId,
              title: title.trim(),
              lines: [
                {
                  description: lineDesc.trim(),
                  quantity: qty || "1.00",
                  unitCostExTax: "0.00",
                  unitSellPriceExTax: price || "0.00",
                  taxCode: "GST",
                  sortOrder: 0,
                },
              ],
            })
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieMobile.variationTitleLabel")} value={title} onChangeText={setTitle} />
        <MobileInput label={t("tradieMobile.variationLineDescLabel")} value={lineDesc} onChangeText={setLineDesc} />
        <MobileInput label={t("tradieMobile.quantityLabel")} value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        <MobileAmountInput label={t("tradieMobile.unitSellPriceLabel")} value={price} onChangeText={setPrice} />
        <MobileInput label={t("tradieMobile.customerApprovalNameLabel")} value={approvedBy} onChangeText={setApprovedBy} />
        <MobileFormLabel label={t("tradieMobile.customerSignatureLabel")} />
        <MobileSignaturePad onChange={setSignaturePaths} height={140} />
      </View>
    </MobileModalDialog>
  );
}
