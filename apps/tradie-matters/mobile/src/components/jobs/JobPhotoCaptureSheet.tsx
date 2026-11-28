import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { t } from "@kaesava/i18n";
import { enqueueAttachment, useOutboxSync } from "@kaesava/mobile-core";
import {
  ChipSelect,
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  MobileModalDialog,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { API_BASE_URL, trpc } from "../../lib/trpc";

type PhotoCategory = "BEFORE" | "PROGRESS" | "AFTER" | "SAFETY" | "COMPLIANCE" | "RECEIPT";

interface JobPhotoCaptureSheetProps {
  visible: boolean;
  tenantId: string;
  userId: string;
  jobId: string;
  visitId?: string | null;
  onClose: () => void;
}

export function JobPhotoCaptureSheet({
  visible,
  tenantId,
  userId,
  jobId,
  visitId,
  onClose,
}: JobPhotoCaptureSheetProps) {
  const toast = useMobileToast();
  const { isOnline } = useOutboxSync();
  const utils = trpc.useUtils();
  const [category, setCategory] = useState<PhotoCategory>("PROGRESS");
  const [caption, setCaption] = useState("");
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState("image/jpeg");
  const [uploading, setUploading] = useState(false);

  const presignMut = trpc.fileNotes.createPreSignedUrl.useMutation();
  const createFileMut = trpc.fileNotes.create.useMutation();
  const attachMut = trpc.field.attachJobPhoto.useMutation();

  const handlePick = async (fromCamera: boolean) => {
    const res = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    const asset = res.assets?.[0];
    if (asset?.uri) {
      setPickedUri(asset.uri);
      setMimeType(asset.mimeType ?? "image/jpeg");
    }
  };

  const handleUpload = async () => {
    if (!pickedUri) return;
    const fileName = `job-${jobId.slice(0, 8)}-${Date.now()}.jpg`;
    if (!isOnline) {
      await enqueueAttachment({
        tenantId,
        userId,
        entityType: "JOB_PHOTO",
        entityId: jobId,
        localUri: pickedUri,
        fileName,
        mimeType,
      });
      toast.info(t("tradieMobile.queuedOfflineToast"));
      setPickedUri(null);
      onClose();
      return;
    }
    setUploading(true);
    try {
      const presigned = await presignMut.mutateAsync({
        entityType: "ENVELOPE",
        entityId: jobId,
        fileName,
        fileMimeType: mimeType,
        fileSize: 1024,
      });
      const uploadUrl = presigned.uploadUrl.startsWith("/") ? `${API_BASE_URL}${presigned.uploadUrl}` : presigned.uploadUrl;
      const blob = await (await fetch(pickedUri)).blob();
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": mimeType }, body: blob });
      const created = await createFileMut.mutateAsync({
        entityType: "ENVELOPE",
        entityId: jobId,
        comment: caption.trim() || undefined,
        attachment: {
          fileKey: presigned.fileKey,
          fileName,
          fileMimeType: mimeType,
          fileSize: blob.size || 1024,
        },
      });
      await attachMut.mutateAsync({
        jobId,
        visitId: visitId ?? null,
        fileNoteId: created.id,
        photoCategory: category,
        visibility: "INTERNAL",
        caption: caption.trim() || null,
      });
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.photoAttachedToast"));
      setPickedUri(null);
      setCaption("");
      onClose();
    } finally {
      setUploading(false);
    }
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieJobs.attachPhotoAction")}
      isDirty={Boolean(pickedUri)}
      footer={<MobileButton title={t("tradieMobile.saveAction")} loading={uploading} disabled={!pickedUri || uploading} onPress={() => void handleUpload()} />}
    >
      <View style={{ gap: 12 }}>
        <View style={styles.btnRow}>
          <MobileButton title={t("tradieMobile.pickCameraAction")} variant="secondary" onPress={() => void handlePick(true)} />
          <MobileButton title={t("tradieMobile.pickLibraryAction")} variant="secondary" onPress={() => void handlePick(false)} />
        </View>
        {pickedUri ? <Text style={styles.selected}>{t("tradieMobile.photoSelectedLabel")}</Text> : null}
        <ChipSelect
          label={t("tradieMobile.photoCategoryLabel")}
          value={category}
          onChange={(v) => setCategory(v as PhotoCategory)}
          options={[
            { label: "Before", value: "BEFORE" },
            { label: "Progress", value: "PROGRESS" },
            { label: "After", value: "AFTER" },
            { label: "Safety", value: "SAFETY" },
          ]}
        />
        <MobileInput label={t("tradieMobile.photoCaptionLabel")} value={caption} onChangeText={setCaption} />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  btnRow: { flexDirection: "row", gap: 8 },
  selected: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.successDark },
});
