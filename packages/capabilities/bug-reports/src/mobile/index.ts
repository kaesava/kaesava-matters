export interface BugReportsMobileAdapter {
  onSubmit: (input: { title: string; description: string; category: string }) => Promise<void>;
}
