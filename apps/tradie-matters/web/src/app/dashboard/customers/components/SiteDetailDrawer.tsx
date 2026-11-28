"use client";

import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { AddressMapActionLink, Badge, Button, DetailDrawer, PhoneActionLink, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import type { SiteRecord } from "./SiteFormModal";

export interface SiteDetailDrawerProps {
  site: SiteRecord | null;
  onClose: () => void;
  onEdit: (site: SiteRecord) => void;
}

export function SiteDetailDrawer({ site, onClose, onEdit }: SiteDetailDrawerProps) {
  const { info } = useToast();
  const historyQuery = trpc.sites.getHistory.useQuery({ id: site?.id ?? "" }, { enabled: Boolean(site?.id) });

  if (!site) return null;
  const fullAddress = [site.addressLine1, site.suburb, site.state, site.postcode].filter(Boolean).join(", ");
  const onCopied = (msg: string) => info(msg);
  const data = historyQuery.data;

  return (
    <DetailDrawer
      title={site.name}
      subtitle={fullAddress}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.close")}</Button>
          <Button type="button" onClick={() => onEdit(site)}>{t("common.edit")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <AddressMapActionLink address={fullAddress} onCopied={onCopied} />
        {site.siteContactPhone && <PhoneActionLink phone={site.siteContactPhone} label={site.siteContactName ?? site.siteContactPhone} onCopied={onCopied} />}
      </div>
      {(site.keySafeCode || site.accessNotes) && (
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
          {site.keySafeCode && <div><span className="font-semibold">{t("tradieCrm.keySafeCodeLabel")}:</span> {site.keySafeCode}</div>}
          {site.accessNotes && <div><span className="font-semibold">{t("tradieCrm.accessNotesLabel")}:</span> {site.accessNotes}</div>}
        </div>
      )}
      {historyQuery.isLoading ? (
        <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">{t("tradieWeb.linkedCustomersTitle")}</h3>
            {(data?.customers ?? []).map((c) => (
              <div key={c.linkId} className="rounded-lg border border-slate-200 p-2.5 text-xs mb-1.5 flex items-center justify-between">
                <span className="font-semibold text-[#1B2B4B]">{c.customer.name}</span>
                <Badge variant="primary">{c.relationshipRole}</Badge>
              </div>
            ))}
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">{t("tradieWeb.recentJobsTitle")}</h3>
            {(data?.jobs ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">{t("tradieWeb.noRecentJobs")}</p>
            ) : (
              <ul className="space-y-1.5">
                {data?.jobs.map((j) => (
                  <li key={j.id}>
                    <Link href={`/dashboard/jobs/${j.id}`} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs hover:bg-slate-50">
                      <span className="font-semibold text-[#1B2B4B]">{j.jobNumber} — {j.title}</span>
                      <Badge variant="primary">{j.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </DetailDrawer>
  );
}
