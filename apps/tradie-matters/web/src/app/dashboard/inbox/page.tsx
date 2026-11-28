"use client";

import React, { useState } from "react";
import { MessageSquare, Send, Star } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, FormLabel, Spinner, fmtDateMedium, useToast } from "@kaesava/ui/web";
import { TRADIE_APP_ID, trpc } from "../../../lib/trpc";
import { SmsTopUpModal } from "./components/SmsTopUpModal";

export default function InboxPage() {
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [tradieName, setTradieName] = useState("");

  const creditsQuery = trpc.sms.getCreditBalance.useQuery();
  const jobsQuery = trpc.jobs.list.useQuery({ limit: 50 });
  const prefsQuery = trpc.getUserPreferences.useQuery();
  const activityQuery = trpc.activity.list.useQuery(selectedJobId ? { jobId: selectedJobId } : undefined);

  const onMyWayMut = trpc.sms.sendOnMyWay.useMutation({
    onSuccess: async () => { await utils.sms.getCreditBalance.invalidate(); success(t("tradieWeb.sendSmsSuccess")); setRecipientPhone(""); },
    onError: (err) => showError(err.message),
  });
  const reviewMut = trpc.sms.sendReviewBooster.useMutation({
    onSuccess: () => success(t("tradieWeb.sendSmsSuccess")),
    onError: (err) => showError(err.message),
  });

  const jobs = jobsQuery.data ?? [];
  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? jobs[0] ?? null;
  const appPrefs = prefsQuery.data?.appPreferences?.[TRADIE_APP_ID] ?? {};
  const googleReviewUrl = typeof appPrefs.googleReviewUrl === "string" ? appPrefs.googleReviewUrl : null;

  const handleSendOnMyWay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJob) return;
    onMyWayMut.mutate({ jobId: selectedJob.id, recipientPhone: recipientPhone.trim(), originLat: -37.8136, originLng: 144.9631, destLat: -37.82, destLng: 144.97, tradieName: tradieName.trim() || "Crew" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieSms.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.inboxSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="primary">{`${t("tradieSms.creditBalanceLabel")}: ${creditsQuery.data ?? 0}`}</Badge>
          <Button type="button" size="sm" onClick={() => setTopUpOpen(true)}>{t("tradieWeb.topUpCreditsAction")}</Button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleSendOnMyWay} className="ui-card space-y-4">
          <h2 className="text-base font-bold text-[#1B2B4B] flex items-center gap-2"><MessageSquare className="w-4 h-4 text-[#2563eb]" /><span>{t("tradieSms.onMyWayCta")}</span></h2>
          <div>
            <FormLabel>{t("tradieWeb.selectJobLabel")}</FormLabel>
            <select value={selectedJob?.id ?? ""} onChange={(e) => setSelectedJobId(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm bg-white">
              {jobs.map((j) => <option key={j.id} value={j.id}>{`${j.jobNumber} — ${j.title}`}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><FormLabel>{t("tradieWeb.recipientPhoneLabel")}</FormLabel><input required value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm font-mono" /></div>
            <div><FormLabel>{t("tradieWeb.tradieNameLabel")}</FormLabel><input required value={tradieName} onChange={(e) => setTradieName(e.target.value)} className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm" /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={onMyWayMut.isPending} disabled={!selectedJob || !recipientPhone.trim() || !tradieName.trim()}><Send className="w-4 h-4" /><span>{t("tradieSms.onMyWayCta")}</span></Button>
            {selectedJob && <Button type="button" variant="secondary" loading={reviewMut.isPending} onClick={() => reviewMut.mutate({ jobId: selectedJob.id, customerId: selectedJob.customerId, googleReviewUrl })}><Star className="w-4 h-4" /><span>{t("tradieSms.sendReviewRequestCta")}</span></Button>}
          </div>
        </form>
        <div className="ui-card space-y-3">
          <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradieWeb.customerFeedTitle")}</h2>
          {activityQuery.isLoading ? <Spinner size="md" /> : (activityQuery.data ?? []).length === 0 ? <p className="text-xs text-slate-500">{t("tradieWeb.noJobsForSmsEmpty")}</p> : (
            <ul className="divide-y divide-slate-200 max-h-80 overflow-y-auto">
              {(activityQuery.data ?? []).map((item) => (
                <li key={item.id} className="py-2.5 flex items-center justify-between text-xs">
                  <div><p className="font-semibold text-[#1B2B4B]">{item.title}</p><p className="text-slate-500">{item.subtitle ?? "-"}</p></div>
                  <span className="text-slate-400">{fmtDateMedium(item.occurredAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <SmsTopUpModal isOpen={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}
