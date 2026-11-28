"use client";

import React, { useId, useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, useToast } from "@kaesava/ui/web";
import { TRADIE_APP_ID, trpc } from "../../../../lib/trpc";

export function CommsSettingsSection() {
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const prefsQuery = trpc.getUserPreferences.useQuery();
  const updatePrefs = trpc.updateUserPreferences.useMutation({
    onSuccess: async () => {
      await utils.getUserPreferences.invalidate();
      success(t("tradieWeb.settingsSaved"));
    },
    onError: (err) => showError(err.message),
  });

  const savedPrefs = prefsQuery.data?.appPreferences?.[TRADIE_APP_ID] ?? {};
  const [reviewUrlDraft, setReviewUrlDraft] = useState<string | null>(null);
  const [twilioDraft, setTwilioDraft] = useState<string | null>(null);
  const googleReviewUrl = reviewUrlDraft ?? (typeof savedPrefs.googleReviewUrl === "string" ? savedPrefs.googleReviewUrl : "");
  const twilioPhoneNumber = twilioDraft ?? (typeof savedPrefs.twilioPhoneNumber === "string" ? savedPrefs.twilioPhoneNumber : "");
  const reviewId = useId();
  const twilioId = useId();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePrefs.mutate({
      appPreferences: {
        [TRADIE_APP_ID]: {
          googleReviewUrl: googleReviewUrl.trim() || null,
          twilioPhoneNumber: twilioPhoneNumber.trim() || null,
        },
      },
    });
  };

  return (
    <form onSubmit={handleSave} className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <h2 className="text-lg font-semibold text-[#1B2B4B]">{t("tradieWeb.commsSettingsTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormLabel htmlFor={reviewId}>{t("tradieWeb.googleReviewUrlLabel")}</FormLabel>
          <input id={reviewId} type="url" value={googleReviewUrl} onChange={(e) => setReviewUrlDraft(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" />
        </div>
        <div>
          <FormLabel htmlFor={twilioId}>{t("tradieWeb.twilioNumberLabel")}</FormLabel>
          <input id={twilioId} value={twilioPhoneNumber} onChange={(e) => setTwilioDraft(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" />
        </div>
      </div>
      <Button type="submit" loading={updatePrefs.isPending}>{t("tradieWeb.saveCommsSettingsAction")}</Button>
    </form>
  );
}
