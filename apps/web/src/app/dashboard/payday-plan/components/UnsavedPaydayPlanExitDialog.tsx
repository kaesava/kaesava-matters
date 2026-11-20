"use client";

import { t } from "@money-matters/i18n";
import { ConfirmDialog } from "@money-matters/ui/web";

export interface UnsavedPaydayPlanExitDialogProps {
  isOpen: boolean;
  isDeficit: boolean;
  deficitAmount?: string;
  submitting?: boolean;
  onClose: () => void;
  onDiscardAndExit: () => void;
}

export function UnsavedPaydayPlanExitDialog({
  isOpen,
  isDeficit,
  deficitAmount = "",
  submitting = false,
  onClose,
  onDiscardAndExit,
}: UnsavedPaydayPlanExitDialogProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onDiscardAndExit}
      title={isDeficit ? t("paydayDrawer.deficitExitTitle") : t("paydayDrawer.unsavedChangesTitle")}
      description={
        isDeficit
          ? t("paydayDrawer.deficitExitDesc", { amount: deficitAmount })
          : t("paydayDrawer.unsavedChangesDesc")
      }
      confirmLabel={t("paydayDrawer.discardAndExit")}
      cancelLabel={t("common.keepEditing")}
      variant="danger"
      isLoading={submitting}
    />
  );
}
