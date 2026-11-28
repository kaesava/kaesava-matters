"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Button, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import "../../../../i18n";

export default function NotificationsSettingsPage() {
  const { showToast } = useToast();
  const utils = trpc.useUtils();
  const statusQuery = trpc.getNotificationChannelStatus.useQuery();
  const prefQuery = trpc.getUserPreferences.useQuery();
  const updatePrefs = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      void utils.getUserPreferences.invalidate();
      showToast({ type: "success", message: t("tradieWeb.settingsSaved") });
    },
  });
  const sendTest = trpc.sendTestNotification.useMutation({
    onSuccess: () => showToast({ type: "success", message: t("tradieWeb.settingsSaved") }),
  });

  if (statusQuery.isLoading || prefQuery.isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;
  }

  const prefs = (prefQuery.data?.notificationPreferences ?? {}) as Record<string, { email?: boolean }>;
  const topics = [
    { key: "quoteAccepted", title: t("tradieWeb.notifTopicQuoteAcceptedTitle"), desc: t("tradieWeb.notifTopicQuoteAcceptedDesc") },
    { key: "invoicePaid", title: t("tradieWeb.notifTopicInvoicePaidTitle"), desc: t("tradieWeb.notifTopicInvoicePaidDesc") },
    { key: "overdueDigest", title: t("tradieWeb.notifTopicOverdueTitle"), desc: t("tradieWeb.notifTopicOverdueDesc") },
  ];

  const toggleTopic = (key: string, enabled: boolean) => {
    updatePrefs.mutate({ notificationPreferences: { ...prefs, [key]: { ...(prefs[key] ?? {}), email: enabled } } });
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieWeb.navNotifications")}</h1>
        <Button type="button" variant="secondary" size="sm" loading={sendTest.isPending} onClick={() => sendTest.mutate({ channel: "email" })}>
          {t("notifications.settings.sendTestButton")}
        </Button>
      </div>
      {statusQuery.data?.emailRecipient && (
        <p className="text-xs text-slate-500">{t("notifications.settings.emailChannelNote", { email: statusQuery.data.emailRecipient })}</p>
      )}
      <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
        {topics.map((topic) => (
          <label key={topic.key} className="p-4 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
              <p className="text-xs text-slate-500">{topic.desc}</p>
            </div>
            <input
              type="checkbox"
              checked={prefs[topic.key]?.email ?? true}
              disabled={updatePrefs.isPending}
              onChange={(e) => toggleTopic(topic.key, e.target.checked)}
              className="w-4 h-4 rounded text-[#2563eb]"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
