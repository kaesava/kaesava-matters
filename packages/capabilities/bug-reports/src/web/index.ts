export interface BugReportsWebAdapter {
  onSubmit: (input: { title: string; description: string; category: string }) => Promise<void>;
}
