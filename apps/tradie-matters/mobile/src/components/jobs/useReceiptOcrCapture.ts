import { useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { t } from "@kaesava/i18n";
import { useMobileToast } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";
import { uploadReceiptToR2 } from "./receiptUpload";

export interface ReceiptBillFormState {
  supplierName: string;
  supplierAbn: string;
  issueDate: string;
  subtotalExTax: string;
  taxAmount: string;
  totalIncTax: string;
  markupPct: string;
}

const INITIAL_FORM: ReceiptBillFormState = {
  supplierName: "",
  supplierAbn: "",
  issueDate: new Date().toISOString().slice(0, 10),
  subtotalExTax: "0.00",
  taxAmount: "0.00",
  totalIncTax: "0.00",
  markupPct: "15",
};

export function useReceiptOcrCapture(jobId: string, onSuccess: () => void) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ReceiptBillFormState>(INITIAL_FORM);
  const [receiptFileNoteId, setReceiptFileNoteId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const presignMut = trpc.fileNotes.createPreSignedUrl.useMutation();
  const createFileMut = trpc.fileNotes.create.useMutation();
  const extractMut = trpc.suppliers.extractReceipt.useMutation();
  const createBillMut = trpc.suppliers.createBill.useMutation();
  const setField = (key: keyof ReceiptBillFormState, value: string) => setForm((p) => ({ ...p, [key]: value }));
  const reset = () => {
    setForm(INITIAL_FORM);
    setReceiptFileNoteId(null);
  };

  const pickReceipt = async (fromCamera: boolean) => {
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7, base64: true };
    const res = fromCamera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const asset = res.assets?.[0];
    if (!asset?.uri) return;
    setScanning(true);
    try {
      const mimeType = asset.mimeType ?? "image/jpeg";
      const fileId = await uploadReceiptToR2(jobId, asset.uri, mimeType, presignMut.mutateAsync, createFileMut.mutateAsync);
      setReceiptFileNoteId(fileId);
      if (asset.base64) {
        const ext = await extractMut.mutateAsync({ imageBase64: asset.base64, mimeType });
        setForm((p) => ({
          ...p,
          supplierName: ext.supplierName,
          supplierAbn: ext.supplierAbn ?? "",
          issueDate: ext.issueDate,
          subtotalExTax: ext.subtotalExTax.toFixed(2),
          taxAmount: ext.taxAmount.toFixed(2),
          totalIncTax: ext.totalIncTax.toFixed(2),
        }));
        toast.success(t("tradieMobile.receiptExtractedToast"));
      }
    } catch {
      toast.info(t("tradieMobile.receiptExtractErrorToast"));
    } finally {
      setScanning(false);
    }
  };

  const saveBill = async () => {
    if (!form.supplierName.trim()) return;
    setSaving(true);
    try {
      await createBillMut.mutateAsync({
        jobId,
        supplierName: form.supplierName.trim(),
        supplierAbn: form.supplierAbn.trim() || null,
        issueDate: form.issueDate.trim() || new Date().toISOString().slice(0, 10),
        subtotalExTax: Number(form.subtotalExTax) || 0,
        taxAmount: Number(form.taxAmount) || 0,
        totalIncTax: Number(form.totalIncTax) || 0,
        receiptFileNoteId,
        source: "OCR",
        appliedMarkupPct: Number(form.markupPct) || 0,
      });
      void utils.jobs.invalidate();
      void utils.suppliers.invalidate();
      toast.success(t("tradieMobile.supplierBillSavedToast"));
      reset();
      onSuccess();
    } finally {
      setSaving(false);
    }
  };

  return { form, setField, scanning, saving, receiptFileNoteId, pickReceipt, saveBill, reset };
}