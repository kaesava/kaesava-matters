"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Clock } from "lucide-react";
import { t } from "@money-matters/i18n";
import { useToast, Button } from "@money-matters/ui/web";
import { trpc } from "../../../../lib/trpc";

function resolvePrefsBlob(raw: unknown, appId?: string): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const map = raw as Record<string, unknown>;
  if (appId && map[appId] && typeof map[appId] === "object") return map[appId] as Record<string, unknown>;
  if (map["money-matters"] && typeof map["money-matters"] === "object") return map["money-matters"] as Record<string, unknown>;
  return map;
}

export default function NotificationSettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const utils = trpc.useUtils();
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const userPrefQuery = trpc.getUserPreferences.useQuery();
  const channelStatusQuery = trpc.getNotificationChannelStatus.useQuery();
  const updatePrefMutation = trpc.updateUserPreferences.useMutation({
    onSuccess: () => {
      utils.getUserPreferences.invalidate();
      toast.success(t("toasts.saved"));
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const sendTestMutation = trpc.sendTestNotification.useMutation({
    onSuccess: (res) => {
      toast.success(
        t("notifications.settings.testEmailSuccess", {
          email: res.emailRecipient,
        })
      );
    },
    onError: (err) => toast.error(err.message || t("common.errorTryAgain")),
  });

  const appId = userPrefQuery.data?.appId;
  const savedPrefs = resolvePrefsBlob(userPrefQuery.data?.appPreferences, appId);
  const isEnabled = (key: string, legacyKey: string) =>
    optimistic[key] ?? (savedPrefs[key] !== false && savedPrefs[legacyKey] !== false);

  const handleToggle = (key: string, value: boolean) => {
    if (!appId) return;
    setOptimistic((prev) => ({ ...prev, [key]: value }));
    updatePrefMutation.mutate({ appPreferences: { [appId]: { ...savedPrefs, [key]: value } } });
  };

  const topics = [
    {
      id: "payday_alerts",
      title: t("notifications.settings.paydayTitle"),
      desc: t("notifications.settings.paydayDesc"),
      schedule: t("notifications.settings.paydaySchedule"),
      emailKey: "payday_alerts_email",
      legacyKey: "payday_alerts_enabled",
    },
    {
      id: "bill_alerts",
      title: t("notifications.settings.billAlertsTitle"),
      desc: t("notifications.settings.billAlertsDesc"),
      schedule: t("notifications.settings.billAlertsSchedule"),
      emailKey: "bill_alerts_email",
      legacyKey: "bill_alerts_enabled",
    },
    {
      id: "weekly_digest",
      title: t("notifications.settings.weeklyDigestTitle"),
      desc: t("notifications.settings.weeklyDigestDesc"),
      schedule: t("notifications.settings.weeklyDigestSchedule"),
      emailKey: "weekly_digest_email",
      legacyKey: "weekly_digest_enabled",
    },
  ];

  const hideAmounts = optimistic.hideAmountsInNotifications ?? userPrefQuery.data?.hideAmountsInNotifications ?? false;
  const handleToggleHideAmounts = (value: boolean) => {
    setOptimistic((prev) => ({ ...prev, hideAmountsInNotifications: value }));
    updatePrefMutation.mutate({ hideAmountsInNotifications: value });
  };

  const status = channelStatusQuery.data;

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="space-y-1.5">
        <button
          type="button"
          onClick={() => router.back()}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {t("notifications.settings.backCta")}
        </button>
        <h1 className="text-2xl font-black text-[#1B2B4B] dark:text-white tracking-tight">
          {t("notifications.settings.title")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("notifications.settings.subtitle")}
        </p>
      </div>

      {status && (
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="inline-flex items-center gap-2 font-semibold text-[#1B2B4B] dark:text-white">
              <Mail className="w-3.5 h-3.5 text-[#2563eb]" />
              {t("notifications.settings.emailChannelNote", { email: status.emailRecipient })}
            </span>
            <Link
              href="/dashboard/settings?tab=profile"
              className="text-xs font-semibold text-[#2563eb] hover:underline"
            >
              {t("notifications.settings.changeEmailLink")}
            </Link>
          </div>
          <span className="text-slate-500 dark:text-slate-400">
            {t("notifications.settings.timezoneNote")}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {topics.map((topic) => {
          const checked = isEnabled(topic.emailKey, topic.legacyKey);
          return (
            <label
              key={topic.id}
              className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer"
            >
              <div className="flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-[#1B2B4B] dark:text-white">{topic.title}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {topic.schedule}
                  </span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{topic.desc}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => handleToggle(topic.emailKey, e.target.checked)}
                  aria-label={`${topic.title} ${t("notifications.settings.emailChannel")}`}
                  className="w-4 h-4 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer"
                />
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t("notifications.settings.emailChannel")}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <label className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-start justify-between gap-4 shadow-xs hover:border-slate-300 dark:hover:border-zinc-700 transition-colors cursor-pointer">
        <div className="flex flex-col gap-1 min-w-0">
          <span className="text-sm font-bold text-[#1B2B4B] dark:text-white">
            {t("notifications.settings.hideAmountsTitle")}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("notifications.settings.hideAmountsDesc")}
          </span>
        </div>
        <input
          type="checkbox"
          checked={hideAmounts}
          onChange={(e) => handleToggleHideAmounts(e.target.checked)}
          aria-label={t("notifications.settings.hideAmountsTitle")}
          className="w-4 h-4 mt-1 text-[#2563eb] rounded focus:ring-2 focus:ring-[#2563eb] cursor-pointer shrink-0"
        />
      </label>

      <div className="pt-1">
        <Button
          variant="secondary"
          onClick={() => sendTestMutation.mutate({ channel: "email" })}
          disabled={sendTestMutation.isPending}
          className="text-xs font-bold"
        >
          {sendTestMutation.isPending ? t("notifications.settings.sendingTest") : t("notifications.settings.sendTestButton")}
        </Button>
      </div>
    </div>
  );
}
