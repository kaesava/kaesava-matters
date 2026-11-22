export interface NotificationsWebAdapter {
  onToggleTopic: (topicKey: string, enabled: boolean) => Promise<void>;
}
