export interface BugReportsWebAdapter {
  onSubmit: (input: { title: string; description: string; category: string }) => Promise<void>;
}

export { FeedbackModal, type FeedbackModalProps, type FeedbackSubmitInput } from "./FeedbackModal.js";
export { SettingsVersionFooter, type SettingsVersionFooterProps } from "./SettingsVersionFooter.js";
