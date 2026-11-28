"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, formatCurrency, GenericListView, useCurrencyLocale, type GenericListColumn } from "@kaesava/ui/web";
import { trpc } from "../../../lib/trpc";
import { JobFormModal } from "./components/JobFormModal";

type JobStatus = "LEAD" | "QUOTED" | "SCHEDULED" | "IN_PROGRESS" | "ON_HOLD" | "COMPLETED" | "INVOICED" | "CANCELLED";

interface JobRow {
  id: string;
  jobNumber: string;
  title: string;
  status: string;
  priority: string;
  quotedAmountExTax: string | null;
  hasUnbilledExtras: boolean;
}

const PIPELINE_STATUSES: Array<{ key: "ALL" | JobStatus; labelKey: string }> = [
  { key: "ALL", labelKey: "tradieWeb.allStatuses" },
  { key: "LEAD", labelKey: "tradieJobs.statusLead" },
  { key: "QUOTED", labelKey: "tradieJobs.statusQuoted" },
  { key: "SCHEDULED", labelKey: "tradieJobs.statusScheduled" },
  { key: "IN_PROGRESS", labelKey: "tradieJobs.statusInProgress" },
  { key: "ON_HOLD", labelKey: "tradieJobs.statusOnHold" },
  { key: "COMPLETED", labelKey: "tradieJobs.statusCompleted" },
  { key: "INVOICED", labelKey: "tradieJobs.statusInvoiced" },
];

export default function JobsPage() {
  const router = useRouter();
  const { currency, locale } = useCurrencyLocale();
  const [statusFilter, setStatusFilter] = useState<"ALL" | JobStatus>("ALL");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const jobsQuery = trpc.jobs.list.useQuery({
    status: statusFilter === "ALL" ? undefined : statusFilter,
    search: search || undefined,
    limit: 100,
  });

  const columns: GenericListColumn<JobRow>[] = [
    { key: "jobNumber", header: t("tradieJobs.jobNumberLabel"), render: (j) => <span className="font-mono text-xs font-bold text-[#2563eb]">{j.jobNumber}</span> },
    { key: "title", header: t("tradieJobs.jobTitleLabel"), render: (j) => <span className="font-semibold text-[#1B2B4B] flex items-center gap-2">{j.title}{j.hasUnbilledExtras && <Badge variant="warning">{t("tradieJobs.unbilledExtrasBadge")}</Badge>}</span> },
    { key: "status", header: t("tradieJobs.statusLabel"), render: (j) => <Badge variant="primary">{j.status}</Badge> },
    { key: "priority", header: t("tradieJobs.priorityLabel"), render: (j) => <Badge variant={j.priority === "URGENT" ? "danger" : "warning"}>{j.priority}</Badge> },
    { key: "quoted", header: t("tradieWeb.quotedAmountLabel"), align: "right", render: (j) => <span className="font-mono tabular-nums">{j.quotedAmountExTax ? formatCurrency(Number(j.quotedAmountExTax), currency, locale) : "-"}</span> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#1B2B4B]">{t("tradieJobs.jobsTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.jobsSubtitle")}</p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /><span>{t("tradieJobs.createJobAction")}</span></Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PIPELINE_STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setStatusFilter(s.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
              statusFilter === s.key ? "bg-[#2563eb] text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t(s.labelKey)}
          </button>
        ))}
      </div>

      <GenericListView items={(jobsQuery.data ?? []) as JobRow[]} columns={columns} isLoading={jobsQuery.isLoading} searchValue={search} onSearchChange={setSearch} searchPlaceholder={t("tradieWeb.searchJobsPlaceholder")} emptyMessage={t("tradieWeb.noJobsEmpty")} onRowClick={(j) => router.push(`/dashboard/jobs/${j.id}`)} />
      <JobFormModal isOpen={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
