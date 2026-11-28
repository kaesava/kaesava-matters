"use client";

import React, { useState, useMemo } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormErrorBanner, FormFieldError, FormLabel, GenericSelectField, Input, ModalDialog } from "@kaesava/ui/web";

export interface FeedbackSubmitInput {
  title: string;
  description: string;
  category: string;
  severity: string;
  email?: string;
}

export interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isSubmitting?: boolean;
  onSubmit: (input: FeedbackSubmitInput) => Promise<void> | void;
}

export function FeedbackModal({ isOpen, onClose, userEmail = "", isSubmitting = false, onSubmit }: FeedbackModalProps) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("ui_ux");
  const [severity, setSeverity] = useState("LOW");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState(userEmail);
  const [titleError, setTitleError] = useState("");
  const [descriptionError, setDescriptionError] = useState("");
  const [generalError, setGeneralError] = useState("");

  const categoryOptions = useMemo(() => [
    { value: "ui_ux", label: t("feedback.categories.ui_ux") },
    { value: "setup", label: t("feedback.categories.setup") },
    { value: "waterfall", label: t("feedback.categories.waterfall") },
    { value: "bank_accounts", label: t("feedback.categories.bank_accounts") },
    { value: "categories_bills", label: t("feedback.categories.categories_bills") },
    { value: "account_auth", label: t("feedback.categories.account_auth") },
    { value: "other", label: t("feedback.categories.other") },
  ], []);

  const severityOptions = useMemo(() => [
    { value: "LOW", label: t("feedback.severities.LOW") },
    { value: "MEDIUM", label: t("feedback.severities.MEDIUM") },
    { value: "HIGH", label: t("feedback.severities.HIGH") },
    { value: "URGENT", label: t("feedback.severities.URGENT") },
  ], []);

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setTitleError("");
    setDescriptionError("");
    setGeneralError("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setTitleError(title.trim() ? "" : t("feedback.errorSummaryRequired"));
    setDescriptionError(description.trim() ? "" : t("feedback.errorDescriptionRequired"));
    if (!title.trim() || !description.trim()) return;
    try {
      await onSubmit({ title: title.trim(), description: description.trim(), category, severity, email: email.trim() || undefined });
      handleClose();
    } catch (err: unknown) {
      setGeneralError(err instanceof Error ? err.message : t("feedback.openEmailFailed"));
    }
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={handleClose} title={t("feedback.title")} isDirty={Boolean(title.trim() || description.trim())}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormErrorBanner message={generalError} />
        <div>
          <FormLabel required>{t("feedback.summaryLabel")}</FormLabel>
          <Input autoFocus value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} placeholder={t("feedback.summaryPlaceholder")} />
          <FormFieldError error={titleError} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <GenericSelectField label={t("feedback.typeLabel")} value={category} onChange={setCategory} options={categoryOptions} />
          <GenericSelectField label={t("feedback.severityLabel")} value={severity} onChange={setSeverity} options={severityOptions} />
        </div>
        <div>
          <FormLabel required>{t("feedback.descriptionLabel")}</FormLabel>
          <textarea value={description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)} placeholder={t("feedback.descriptionPlaceholder")} rows={4} className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-3 text-sm" />
          <FormFieldError error={descriptionError} />
        </div>
        <div>
          <FormLabel>{t("feedback.emailLabel")}</FormLabel>
          <Input type="email" value={email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>{t("common.cancel")}</Button>
          <Button type="submit" variant="primary" loading={isSubmitting}>{t("feedback.submitCta")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
