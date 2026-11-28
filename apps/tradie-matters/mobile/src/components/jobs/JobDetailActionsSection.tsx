import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { MobileButton, ReadOnlyField, SettingsCard } from "@kaesava/ui/mobile";
import { ConvertJobInvoiceSheet } from "../invoices/ConvertJobInvoiceSheet";
import { JobCrewChatSheet } from "./JobCrewChatSheet";
import { JobPhotoCaptureSheet } from "./JobPhotoCaptureSheet";
import { MaterialQuickAddSheet } from "./MaterialQuickAddSheet";
import { ReceiptSnapOcrSheet } from "./ReceiptSnapOcrSheet";
import { VariationCaptureSheet } from "./VariationCaptureSheet";

interface JobDetailActionsSectionProps {
  tenantId: string;
  userId: string;
  jobId: string;
  jobNumber: string;
  visitId?: string;
  variationsCount: number;
  materialsCount: number;
  photosCount: number;
}

export function JobDetailActionsSection({
  tenantId,
  userId,
  jobId,
  jobNumber,
  visitId,
  variationsCount,
  materialsCount,
  photosCount,
}: JobDetailActionsSectionProps) {
  const [variationOpen, setVariationOpen] = useState(false);
  const [materialOpen, setMaterialOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);

  return (
    <>
      <SettingsCard title={t("tradieJobs.variationsTitle")}>
        <MobileButton title={t("tradieJobs.createVariationAction")} onPress={() => setVariationOpen(true)} />
        <MobileButton title={t("tradieJobs.logMaterialAction")} variant="secondary" onPress={() => setMaterialOpen(true)} />
        <MobileButton title={t("tradieJobs.attachPhotoAction")} variant="secondary" onPress={() => setPhotoOpen(true)} />
        <MobileButton title={t("tradieSync.scanReceiptCta")} variant="secondary" onPress={() => setReceiptOpen(true)} />
        <MobileButton title={t("chat.title")} variant="secondary" onPress={() => setChatOpen(true)} />
        <MobileButton title={t("tradieInvoices.convertJobToInvoice")} variant="secondary" onPress={() => setInvoiceOpen(true)} />
        <ReadOnlyField label={t("tradieJobs.variationsTitle")} value={String(variationsCount)} />
        <ReadOnlyField label={t("tradieJobs.materialsTitle")} value={String(materialsCount)} />
        <ReadOnlyField label={t("tradieJobs.photosTitle")} value={String(photosCount)} />
      </SettingsCard>
      <VariationCaptureSheet visible={variationOpen} jobId={jobId} onClose={() => setVariationOpen(false)} />
      <MaterialQuickAddSheet visible={materialOpen} tenantId={tenantId} userId={userId} jobId={jobId} visitId={visitId} onClose={() => setMaterialOpen(false)} />
      <JobPhotoCaptureSheet visible={photoOpen} tenantId={tenantId} userId={userId} jobId={jobId} visitId={visitId} onClose={() => setPhotoOpen(false)} />
      <ReceiptSnapOcrSheet visible={receiptOpen} jobId={jobId} onClose={() => setReceiptOpen(false)} />
      <JobCrewChatSheet visible={chatOpen} jobId={jobId} jobNumber={jobNumber} onClose={() => setChatOpen(false)} />
      <ConvertJobInvoiceSheet visible={invoiceOpen} initialJobId={jobId} onClose={() => setInvoiceOpen(false)} />
    </>
  );
}