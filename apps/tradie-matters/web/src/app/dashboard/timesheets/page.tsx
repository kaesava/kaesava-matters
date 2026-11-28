"use client";

import React, { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, GenericListView, PaginationBar, SkeletonTable, type GenericListColumn, useToast } from "@kaesava/ui/web";
import { useLocale } from "../../../providers/LocaleProvider";
import { trpc } from "../../../lib/trpc";

const PAGE_SIZE = 20;

export default function TimesheetsPage() {
  const { success } = useToast();
  const { fmtDateMedium } = useLocale();
  const utils = trpc.useUtils();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const listQuery = trpc.timesheets.list.useQuery();
  const approveMut = trpc.timesheets.approve.useMutation({
    onSuccess: async () => {
      await utils.timesheets.list.invalidate();
      success(t("tradieWeb.timesheetUpdatedSuccess"));
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (listQuery.data ?? [])
      .filter((r) =>
        !q ||
        (r.workerName ?? "").toLowerCase().includes(q) ||
        (r.jobNumber ?? "").toLowerCase().includes(q) ||
        (r.jobTitle ?? "").toLowerCase().includes(q),
      )
      .map((r) => ({ ...r, id: r.entry.id }));
  }, [listQuery.data, search]);

  const pagedRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  type Row = (typeof rows)[number];

  const columns: GenericListColumn<Row>[] = [
    { key: "worker", header: t("tradieWeb.crewMemberLabel"), render: (r) => <span className="font-medium text-slate-900 dark:text-slate-100">{r.workerName || r.workerEmail || "-"}</span> },
    { key: "job", header: t("tradieWeb.selectJobLabel"), render: (r) => <span className="text-slate-600 dark:text-slate-300">{r.jobNumber ? `${r.jobNumber} — ${r.jobTitle ?? ""}` : "-"}</span> },
    { key: "date", header: t("tradieWeb.visitDateLabel"), align: "center", render: (r) => <span className="text-xs text-slate-500">{fmtDateMedium(r.entry.startedAt)}</span> },
    { key: "duration", header: t("tradieWeb.durationHeader"), align: "right", render: (r) => <span className="font-mono tabular-nums">{t("tradieWeb.durationMinutes", { minutes: String(r.entry.durationMinutes ?? 0) })}</span> },
    {
      key: "status",
      header: t("tradieJobs.statusLabel"),
      align: "center",
      render: (r) => (
        <Badge variant={r.entry.isBillable ? "success" : "warning"}>
          {r.entry.isBillable ? t("tradieWeb.billableBadge") : t("tradieWeb.nonBillableBadge")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("common.actions"),
      align: "center",
      render: (r) => (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={approveMut.isPending}
          onClick={() => approveMut.mutate({ entryId: r.entry.id, isBillable: !r.entry.isBillable })}
        >
          <Check className="w-3.5 h-3.5" />
          <span>{r.entry.isBillable ? t("tradieWeb.markNonBillableAction") : t("tradieWeb.approveBillableAction")}</span>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">{t("tradiePulse.timesheets")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.timesheetsSubtitle")}</p>
      </div>
      {listQuery.isLoading ? (
        <SkeletonTable rows={6} />
      ) : (
        <>
          <GenericListView
            items={pagedRows}
            columns={columns}
            searchValue={search}
            onSearchChange={(v) => { setSearch(v); setPage(1); }}
            searchPlaceholder={t("common.searchPlaceholder")}
            emptyMessage={t("tradieWeb.noTimeEntriesEmpty")}
          />
          {rows.length >= 5 && (
            <PaginationBar
              page={page}
              totalPages={Math.max(1, Math.ceil(rows.length / PAGE_SIZE))}
              totalItems={rows.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
              onPageSizeChange={() => {}}
            />
          )}
        </>
      )}
    </div>
  );
}
