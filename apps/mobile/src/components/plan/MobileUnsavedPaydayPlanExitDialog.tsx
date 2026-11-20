import React from 'react';
import { MobileConfirmDialog } from '@money-matters/ui/mobile';
import { t } from '@money-matters/i18n';

export interface MobileUnsavedPaydayPlanExitDialogProps {
  visible: boolean;
  isDeficit: boolean;
  deficitAmount?: string;
  submitting?: boolean;
  onClose: () => void;
  onDiscardAndExit: () => void;
}

export function MobileUnsavedPaydayPlanExitDialog({
  visible,
  isDeficit,
  deficitAmount = '',
  submitting = false,
  onClose,
  onDiscardAndExit,
}: MobileUnsavedPaydayPlanExitDialogProps) {
  return (
    <MobileConfirmDialog
      visible={visible}
      title={isDeficit ? t('paydayDrawer.deficitExitTitle') : t('paydayDrawer.unsavedChangesTitle')}
      message={
        isDeficit
          ? t('paydayDrawer.deficitExitDesc', { amount: deficitAmount })
          : t('paydayDrawer.unsavedChangesDesc')
      }
      confirmText={t('paydayDrawer.discardAndExit')}
      cancelText={t('common.keepEditing')}
      isDestructive={true}
      isLoading={submitting}
      onCancel={onClose}
      onConfirm={onDiscardAndExit}
    />
  );
}
