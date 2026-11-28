"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, DatePickerField, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface VisitModalTarget {
  visitId?: string;
  jobId?: string;
  title?: string;
  dateIso?: string;
  startTime?: string;
  endTime?: string;
  assigneeUserId?: string;
}

export interface VisitFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  target?: VisitModalTarget | null;
}

export function VisitFormModal({ isOpen, onClose, target }: VisitFormModalProps) {
  const modalKey = isOpen ? `${target?.visitId ?? "new"}-${target?.jobId ?? ""}-${target?.dateIso ?? ""}` : "closed";
  return <VisitFormModalInner key={modalKey} isOpen={isOpen} onClose={onClose} target={target} />;
}

function VisitFormModalInner({ isOpen, onClose, target }: VisitFormModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const isEdit = Boolean(target?.visitId);
  const [jobId, setJobId] = useState(target?.jobId ?? "");
  const [title, setTitle] = useState(target?.title ?? "");
  const [dateIso, setDateIso] = useState(target?.dateIso ?? new Date().toISOString().slice(0, 10));
  const [startTime, setStartTime] = useState(target?.startTime ?? "08:00");
  const [endTime, setEndTime] = useState(target?.endTime ?? "10:00");
  const [assigneeId, setAssigneeId] = useState(target?.assigneeUserId ?? "");
  const [visitNotes, setVisitNotes] = useState("");

  const jobsQuery = trpc.jobs.list.useQuery({ limit: 50 }, { enabled: isOpen && !isEdit });
  const crewQuery = trpc.listTeamMembersWithRates.useQuery(undefined, { enabled: isOpen });

  const createMut = trpc.dispatch.createVisit.useMutation({ onSuccess: () => utils.dispatch.getBoard.invalidate() });
  const rescheduleMut = trpc.dispatch.rescheduleVisit.useMutation({ onSuccess: () => utils.dispatch.getBoard.invalidate() });
  const isPending = createMut.isPending || rescheduleMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const scheduledStart = new Date(`${dateIso}T${startTime}:00`).toISOString();
    const scheduledEnd = new Date(`${dateIso}T${endTime}:00`).toISOString();
    const assigneeUserIds = assigneeId ? [assigneeId] : [];
    if (isEdit && target?.visitId) {
      await rescheduleMut.mutateAsync({ visitId: target.visitId, scheduledStart, scheduledEnd, assigneeUserIds });
      success(t("tradieWeb.visitRescheduled"));
    } else {
      await createMut.mutateAsync({ jobId, title: title.trim(), scheduledStart, scheduledEnd, assigneeUserIds, leadUserId: assigneeId || undefined, visitNotes: visitNotes.trim() || null });
      success(t("tradieWeb.visitCreated"));
    }
    onClose();
  };

  const jobOpts = (jobsQuery.data ?? []).map((j) => ({ value: j.id, label: `${j.jobNumber} — ${j.title}` }));
  const crewOpts = (crewQuery.data ?? []).map((m) => ({ value: m.userId, label: m.displayName }));

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} isDirty={title.trim().length > 0 || isEdit} title={isEdit ? t("tradieWeb.editVisitTitle") : t("tradieJobs.scheduleVisitAction")}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {!isEdit && (
          <div><FormLabel required>{t("tradieWeb.selectJobLabel")}</FormLabel><GenericSelectField value={jobId} onChange={(v) => { setJobId(v); const found = jobsQuery.data?.find((j) => j.id === v); if (found && !title) setTitle(found.title); }} options={jobOpts} placeholder={t("tradieWeb.selectJobLabel")} /></div>
        )}
        <div><FormLabel required>{t("tradieWeb.visitTitleLabel")}</FormLabel><Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={isEdit} required /></div>
        <div className="grid grid-cols-3 gap-3">
          <DatePickerField label={t("tradieWeb.visitDateLabel")} value={dateIso} onChange={setDateIso} />
          <div><FormLabel>{t("tradieWeb.startTimeLabel")}</FormLabel><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
          <div><FormLabel>{t("tradieWeb.endTimeLabel")}</FormLabel><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
        </div>
        <div><FormLabel>{t("tradieWeb.assignCrewLabel")}</FormLabel><GenericSelectField value={assigneeId} onChange={setAssigneeId} options={crewOpts} placeholder={t("tradieWeb.assignCrewLabel")} /></div>
        {!isEdit && <div><FormLabel>{t("tradieWeb.visitNotesLabel")}</FormLabel><Input value={visitNotes} onChange={(e) => setVisitNotes(e.target.value)} /></div>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={(!isEdit && !jobId) || !title.trim() || isPending} loading={isPending}>{t("common.save")}</Button>
        </div>
      </form>
    </ModalDialog>
  );
}
