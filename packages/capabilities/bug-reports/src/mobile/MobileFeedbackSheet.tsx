import React, { useState, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { t } from "@kaesava/i18n";
import { ChipSelect, FormErrorBanner, FormFieldError, FormLabel, MobileButton, MobileInput, MobileModalDialog } from "@kaesava/ui/mobile";

export interface MobileFeedbackSubmitInput {
  title: string;
  description: string;
  category: string;
  severity: string;
  email?: string;
}

export interface MobileFeedbackSheetProps {
  visible: boolean;
  onClose: () => void;
  userEmail?: string;
  isSubmitting?: boolean;
  onSubmit: (input: MobileFeedbackSubmitInput) => Promise<void> | void;
}

export function MobileFeedbackSheet({
  visible,
  onClose,
  userEmail = "",
  isSubmitting = false,
  onSubmit,
}: MobileFeedbackSheetProps) {
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

  const handleSubmit = async () => {
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
    <MobileModalDialog visible={visible} onClose={handleClose} title={t("feedback.title")} isDirty={Boolean(title.trim() || description.trim())}>
      <View style={styles.form}>
        <FormErrorBanner message={generalError} />
        <FormLabel required>{t("feedback.summaryLabel")}</FormLabel>
        <MobileInput value={title} onChangeText={setTitle} placeholder={t("feedback.summaryPlaceholder")} />
        <FormFieldError error={titleError} />
        <FormLabel>{t("feedback.typeLabel")}</FormLabel>
        <ChipSelect value={category} onChange={setCategory} options={categoryOptions} />
        <FormLabel>{t("feedback.severityLabel")}</FormLabel>
        <ChipSelect value={severity} onChange={setSeverity} options={severityOptions} />
        <FormLabel required>{t("feedback.descriptionLabel")}</FormLabel>
        <MobileInput value={description} onChangeText={setDescription} placeholder={t("feedback.descriptionPlaceholder")} multiline numberOfLines={4} />
        <FormFieldError error={descriptionError} />
        <FormLabel>{t("feedback.emailLabel")}</FormLabel>
        <MobileInput value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        <MobileButton title={t("feedback.submitCta")} onPress={handleSubmit} loading={isSubmitting} />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  form: { gap: 8, paddingBottom: 16 },
});
