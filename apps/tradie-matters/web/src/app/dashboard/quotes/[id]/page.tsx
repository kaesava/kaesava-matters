"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Badge, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import { QuoteLinesEditor, type DraftQuoteLine } from "./components/QuoteLinesEditor";
import { QuoteOptionGroupsPanel, type DraftOptionGroup } from "./components/QuoteOptionGroupsPanel";
import { QuoteSummaryCard } from "./components/QuoteSummaryCard";

type QuoteDetailData = NonNullable<Awaited<ReturnType<ReturnType<typeof trpc.useUtils>["quotes"]["getById"]["fetch"]>>>;

function QuoteDetailEditor({ data, id }: { data: QuoteDetailData; id: string }) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [groups, setGroups] = useState<DraftOptionGroup[]>(() =>
    data.optionGroups.map((g) => ({ key: g.id, name: g.name, isRecommended: g.isRecommended, isSelected: g.isSelected })),
  );
  const [lines, setLines] = useState<DraftQuoteLine[]>(() =>
    data.lines.map((l) => ({ optionGroupKey: l.optionGroupId ?? undefined, pricebookItemId: l.pricebookItemId, description: l.description, quantity: Number(l.quantity), unitCostExTax: Number(l.unitCostExTax), unitSellPrice: Number(l.unitSellPrice), taxCode: l.taxCode === "GST_FREE" ? "GST_FREE" : "GST" })),
  );
  const [gstMode, setGstMode] = useState<"EXCLUSIVE" | "INCLUSIVE" | "GST_FREE">(data.quote.gstMode as "EXCLUSIVE" | "INCLUSIVE" | "GST_FREE");
  const [depositType, setDepositType] = useState<"NONE" | "PERCENT" | "FIXED">(data.quote.depositType as "NONE" | "PERCENT" | "FIXED");
  const [depositValue, setDepositValue] = useState(() => Number(data.quote.depositValue) || 0);
  const [followUpEnabled, setFollowUpEnabled] = useState(true);
  const [portalLink, setPortalLink] = useState<string | null>(null);

  const updateMut = trpc.quotes.update.useMutation({ onSuccess: async () => { await utils.quotes.getById.invalidate({ id }); success(t("tradieWeb.quoteSaved")); } });
  const sendMut = trpc.quotes.send.useMutation({
    onSuccess: async (res) => {
      await utils.quotes.getById.invalidate({ id });
      setPortalLink(`/q/${res.rawToken}`);
      success(t("tradieWeb.quoteSent"));
    },
  });

  const isLocked = data.quote.status === "ACCEPTED";
  const handleSave = () => updateMut.mutate({ id: data.quote.id, title: data.quote.title, customerId: data.quote.customerId, siteId: data.quote.siteId, jobId: data.quote.jobId, gstMode, depositType, depositValue, notes: data.quote.notes, optionGroups: groups.map((g, i) => ({ ...g, sortOrder: i })), lines: lines.map((l, i) => ({ ...l, sortOrder: i })) });
  const handlePreviewPdf = async () => {
    if (!data.quote.pdfFileNoteId) return;
    const { downloadUrl } = await utils.fileNotes.getDownloadUrl.fetch({ id: data.quote.pdfFileNoteId });
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <Link href="/dashboard/quotes" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2563eb]">
        <ArrowLeft className="w-4 h-4" /><span>{t("tradieWeb.backToQuotes")}</span>
      </Link>
      <div className="ui-card flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-[#2563eb]">{data.quote.quoteNumber}</span>
            <Badge variant={isLocked ? "success" : "primary"}>{data.quote.status}</Badge>
          </div>
          <h1 className="text-xl font-extrabold text-[#1B2B4B] mt-1">{data.quote.title}</h1>
        </div>
        {portalLink && (
          <Link href={portalLink} target="_blank" className="text-xs font-bold text-[#2563eb] underline">{t("tradieWeb.openCustomerPortal")}</Link>
        )}
      </div>
      <QuoteOptionGroupsPanel groups={groups} onChange={setGroups} disabled={isLocked} />
      <QuoteLinesEditor lines={lines} groups={groups} onChange={setLines} disabled={isLocked} />
      <QuoteSummaryCard gstMode={gstMode} depositType={depositType} depositValue={depositValue} followUpEnabled={followUpEnabled} groups={groups} lines={lines} onGstModeChange={setGstMode} onDepositTypeChange={setDepositType} onDepositValueChange={setDepositValue} onFollowUpChange={setFollowUpEnabled} onSave={handleSave} onSend={() => sendMut.mutate({ id: data.quote.id })} onPreviewPdf={() => void handlePreviewPdf()} hasPdf={Boolean(data.quote.pdfFileNoteId)} isSaving={updateMut.isPending} isSending={sendMut.isPending} disabled={isLocked} />
    </div>
  );
}

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const detailQuery = trpc.quotes.getById.useQuery({ id }, { enabled: Boolean(id) });

  if (detailQuery.isLoading) return <div className="py-12 flex justify-center"><Spinner size="lg" /></div>;
  const data = detailQuery.data;
  if (!data) return <div className="ui-card text-center py-10 text-sm text-slate-500">{t("tradieWeb.noQuotesEmpty")}</div>;

  return <QuoteDetailEditor key={detailQuery.dataUpdatedAt} data={data} id={id} />;
}
