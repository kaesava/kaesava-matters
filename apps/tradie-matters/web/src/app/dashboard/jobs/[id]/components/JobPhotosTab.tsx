"use client";

import React, { useState } from "react";
import { Camera, Plus } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Button, FormLabel, GenericSelectField, Input, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

export interface JobPhotoItem {
  id: string;
  fileNoteId: string;
  photoCategory: string;
  caption: string | null;
}

type PhotoCategory = "BEFORE" | "PROGRESS" | "AFTER" | "SAFETY" | "COMPLIANCE" | "RECEIPT";

const CATEGORIES: Array<{ value: PhotoCategory; labelKey: string }> = [
  { value: "BEFORE", labelKey: "tradieWeb.photoCategoryBefore" },
  { value: "PROGRESS", labelKey: "tradieWeb.photoCategoryProgress" },
  { value: "AFTER", labelKey: "tradieWeb.photoCategoryAfter" },
  { value: "SAFETY", labelKey: "tradieWeb.photoCategorySafety" },
  { value: "COMPLIANCE", labelKey: "tradieWeb.photoCategoryCompliance" },
  { value: "RECEIPT", labelKey: "tradieWeb.photoCategoryReceipt" },
];

export function JobPhotosTab({ jobId, photos }: { jobId: string; photos: readonly JobPhotoItem[] }) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [filterCat, setFilterCat] = useState<"ALL" | PhotoCategory>("ALL");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<PhotoCategory>("PROGRESS");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const preSignMut = trpc.fileNotes.createPreSignedUrl.useMutation();
  const createNoteMut = trpc.fileNotes.create.useMutation();
  const attachMut = trpc.field.attachJobPhoto.useMutation({ onSuccess: () => utils.jobs.getDetail.invalidate({ id: jobId }) });
  const isPending = preSignMut.isPending || createNoteMut.isPending || attachMut.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    const { uploadUrl, fileKey } = await preSignMut.mutateAsync({ entityType: "JOB", entityId: jobId, fileName: file.name, fileMimeType: file.type || "image/jpeg", fileSize: file.size });
    await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": file.type || "image/jpeg" } });
    const note = await createNoteMut.mutateAsync({ entityType: "JOB", entityId: jobId, comment: caption.trim() || undefined, attachment: { fileKey, fileName: file.name, fileMimeType: file.type || "image/jpeg", fileSize: file.size } });
    await attachMut.mutateAsync({ jobId, fileNoteId: note.id, photoCategory: category, visibility: "INTERNAL", caption: caption.trim() || null });
    success(t("tradieWeb.photoAttached"));
    setFile(null);
    setCaption("");
    setOpen(false);
  };

  const visible = filterCat === "ALL" ? photos : photos.filter((p) => p.photoCategory === filterCat);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setFilterCat("ALL")} className={`px-2.5 py-1 rounded-full text-xs font-bold ${filterCat === "ALL" ? "bg-[#2563eb] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{t("tradieWeb.allPhotoCategories")}</button>
          {CATEGORIES.map((c) => (
            <button key={c.value} type="button" onClick={() => setFilterCat(c.value)} className={`px-2.5 py-1 rounded-full text-xs font-bold ${filterCat === c.value ? "bg-[#2563eb] text-white" : "bg-white border border-slate-200 text-slate-600"}`}>{t(c.labelKey)}</button>
          ))}
        </div>
        <Button type="button" size="sm" onClick={() => setOpen(true)}><Plus className="w-4 h-4" /><span>{t("tradieJobs.attachPhotoAction")}</span></Button>
      </div>
      {visible.length === 0 ? (
        <div className="ui-card text-center py-8 text-xs text-slate-500">{t("tradieWeb.noPhotosEmpty")}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {visible.map((p) => (
            <div key={p.id} className="ui-card flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0"><Camera className="w-5 h-5" /></div>
              <div className="min-w-0">
                <Badge variant="primary">{p.photoCategory}</Badge>
                <p className="text-xs text-slate-600 mt-1 truncate">{p.caption ?? p.fileNoteId}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      <ModalDialog isOpen={open} onClose={() => setOpen(false)} isDirty={Boolean(file)} title={t("tradieJobs.attachPhotoAction")}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div><FormLabel>{t("tradieWeb.photoCategoryLabel")}</FormLabel><GenericSelectField value={category} onChange={(v) => setCategory(v as PhotoCategory)} options={CATEGORIES.map((c) => ({ value: c.value, label: t(c.labelKey) }))} /></div>
          <div><FormLabel required>{t("tradieWeb.photoFileLabel")}</FormLabel><input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-[#2563eb] file:font-semibold" required /></div>
          <div><FormLabel>{t("tradieWeb.photoCaptionLabel")}</FormLabel><Input value={caption} onChange={(e) => setCaption(e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={!file || isPending} loading={isPending}>{t("common.save")}</Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  );
}
