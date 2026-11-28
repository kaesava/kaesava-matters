"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Camera, Clock, FileCheck, MessageSquare, Package } from "lucide-react";
import { t } from "@kaesava/i18n";
import { JOB_STATUS_WORKFLOW, type JobStatus } from "@tradie-matters/capability-operations";
import { Badge, Button, formatCurrency, Spinner, Tabs, useCurrencyLocale, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { JobInternalChatTab } from "./components/JobInternalChatTab";
import { JobLiveProfitBar } from "./components/JobLiveProfitBar";
import { JobMaterialsTab } from "./components/JobMaterialsTab";
import { JobPhotosTab } from "./components/JobPhotosTab";
import { JobVariationsTab } from "./components/JobVariationsTab";
import { JobVisitsTimersTab } from "./components/JobVisitsTimersTab";

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();
  const { currency, locale } = useCurrencyLocale();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState("visits");

  const detailQuery = trpc.jobs.getDetail.useQuery({ id }, { enabled: Boolean(id) });
  const transitionMut = trpc.jobs.transitionStatus.useMutation({
    onSuccess: async () => {
      await utils.jobs.getDetail.invalidate({ id });
      success(t("tradieWeb.jobStatusUpdated"));
    },
  });

  if (detailQuery.isLoading) {
    return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  }

  const data = detailQuery.data;
  if (!data) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb]"><ArrowLeft className="w-4 h-4" />{t("tradieWeb.backToJobs")}</Link>
        <div className="ui-card text-center py-10 text-sm text-slate-500">{t("tradieWeb.noJobsEmpty")}</div>
      </div>
    );
  }

  const { job, customer, site, visits, timeEntries, variations, materialUsages, attachments } = data;
  const nextStatuses = JOB_STATUS_WORKFLOW.transitions[job.status as JobStatus] ?? [];

  return (
    <div className="space-y-6">
      <Link href="/dashboard/jobs" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
        <ArrowLeft className="w-4 h-4" /><span>{t("tradieWeb.backToJobs")}</span>
      </Link>

      <div className="ui-card flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2563eb]">{job.jobNumber}</span>
            <Badge variant="primary">{job.status}</Badge>
            <Badge variant={job.priority === "URGENT" ? "danger" : "warning"}>{job.priority}</Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{job.title}</h1>
          <p className="text-xs text-slate-500">
            {customer?.name ?? "-"}{site ? ` • ${site.name}` : ""}
            {job.quotedAmountExTax ? ` • ${formatCurrency(Number(job.quotedAmountExTax), currency, locale)}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {nextStatuses.map((status) => (
            <Button key={status} type="button" size="sm" variant="secondary" disabled={transitionMut.isPending} onClick={() => void transitionMut.mutateAsync({ id: job.id, status })}>
              {status}
            </Button>
          ))}
        </div>
      </div>

      <JobLiveProfitBar jobId={job.id} />

      <Tabs
        activeTab={tab}
        onChange={setTab}
        tabs={[
          { id: "visits", label: t("tradieWeb.tabVisitsTimers"), icon: <Clock className="w-3.5 h-3.5" />, badge: visits.length },
          { id: "variations", label: t("tradieWeb.tabVariations"), icon: <FileCheck className="w-3.5 h-3.5" />, badge: variations.length },
          { id: "materials", label: t("tradieWeb.tabMaterials"), icon: <Package className="w-3.5 h-3.5" />, badge: materialUsages.length },
          { id: "photos", label: t("tradieWeb.tabPhotos"), icon: <Camera className="w-3.5 h-3.5" />, badge: attachments.length },
          { id: "chat", label: t("tradieWeb.tabInternalChat"), icon: <MessageSquare className="w-3.5 h-3.5" /> },
        ]}
      />

      {tab === "visits" && <JobVisitsTimersTab jobId={job.id} jobTitle={job.title} visits={visits} timeEntries={timeEntries} />}
      {tab === "variations" && <JobVariationsTab jobId={job.id} variations={variations} />}
      {tab === "materials" && <JobMaterialsTab jobId={job.id} materials={materialUsages} />}
      {tab === "photos" && <JobPhotosTab jobId={job.id} photos={attachments} />}
      {tab === "chat" && <JobInternalChatTab jobId={job.id} jobTitle={job.title} />}
    </div>
  );
}
