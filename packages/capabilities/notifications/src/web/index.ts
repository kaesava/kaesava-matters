export interface NotificationsWebAdapter {
  onToggleTopic: (topicKey: string, enabled: boolean) => Promise<void>;
}

export {
  NotificationPreferencesView,
  type NotificationPreferencesViewProps,
  type NotificationTopicItem,
} from "./NotificationPreferencesView.js";
