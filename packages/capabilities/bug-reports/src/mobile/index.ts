export interface BugReportsMobileAdapter {
  onSubmit: (input: { title: string; description: string; category: string }) => Promise<void>;
}

export { MobileFeedbackSheet, type MobileFeedbackSheetProps, type MobileFeedbackSubmitInput } from "./MobileFeedbackSheet";
export { SettingsVersionFooter, type SettingsVersionFooterProps } from "./SettingsVersionFooter";
