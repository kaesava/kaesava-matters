"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Button } from "@kaesava/ui/web";

export interface NotificationTopicItem {
  key: string;
  title: string;
  description: string;
  scheduleLabel?: string;
  emailEnabled: boolean;
  pushEnabled?: boolean;
  showPush?: boolean;
}

export interface NotificationPreferencesViewProps {
  topics: NotificationTopicItem[];
  emailAddress?: string;
  hideAmounts?: boolean;
  isSaving?: boolean;
  isSendingTest?: boolean;
  onToggleTopic: (topicKey: string, channel: "email" | "push", enabled: boolean) => void;
  onToggleHideAmounts?: (enabled: boolean) => void;
  onSendTest?: () => void;
}

export function NotificationPreferencesView({
  topics,
  emailAddress,
  hideAmounts,
  isSaving = false,
  isSendingTest = false,
  onToggleTopic,
  onToggleHideAmounts,
  onSendTest,
}: NotificationPreferencesViewProps) {
  return (
    <div className="space-y-4">
      {emailAddress && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("notifications.settings.emailChannelNote", { email: emailAddress })}
        </p>
      )}
      <div className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        {topics.map((topic) => (
          <div key={topic.key} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{topic.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{topic.description}</p>
              {topic.scheduleLabel && <p className="text-xs text-slate-400">{topic.scheduleLabel}</p>}
            </div>
            <div className="flex items-center gap-4 shrink-0">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topic.emailEnabled}
                  disabled={isSaving}
                  onChange={(e) => onToggleTopic(topic.key, "email", e.target.checked)}
                />
                <span>{t("notifications.settings.emailChannel")}</span>
              </label>
              {topic.showPush && (
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(topic.pushEnabled)}
                    disabled={isSaving}
                    onChange={(e) => onToggleTopic(topic.key, "push", e.target.checked)}
                  />
                  <span>{t("notifications.settings.pushChannel")}</span>
                </label>
              )}
            </div>
          </div>
        ))}
      </div>
      {onToggleHideAmounts && (
        <label className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(hideAmounts)}
            disabled={isSaving}
            onChange={(e) => onToggleHideAmounts(e.target.checked)}
            className="mt-0.5"
          />
          <div className="space-y-0.5">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{t("notifications.settings.hideAmountsTitle")}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t("notifications.settings.hideAmountsDesc")}</p>
          </div>
        </label>
      )}
      {onSendTest && (
        <Button type="button" variant="secondary" size="sm" onClick={onSendTest} loading={isSendingTest}>
          {isSendingTest ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
        </Button>
      )}
    </div>
  );
}
