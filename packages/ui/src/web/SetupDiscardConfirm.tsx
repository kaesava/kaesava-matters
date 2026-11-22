"use client";

import React from "react";
import { ConfirmDialog } from "./ConfirmDialog";

export interface SetupDiscardConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Generic setup wizard discard confirmation dialog.
 */
export function SetupDiscardConfirm({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: SetupDiscardConfirmProps) {
  return (
    <ConfirmDialog
      isOpen={isOpen}
      title={title}
      description={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      variant="danger"
      onConfirm={onConfirm}
      onClose={onCancel}
    />
  );
}
