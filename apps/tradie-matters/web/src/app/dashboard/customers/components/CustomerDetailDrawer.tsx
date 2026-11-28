"use client";

import React from "react";
import Link from "next/link";
import { t } from "@kaesava/i18n";
import { AddressMapActionLink, Badge, Button, DetailDrawer, EmailActionLink, PhoneActionLink, Spinner, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";
import type { CustomerRecord } from "./CustomerFormModal";

export interface CustomerDetailDrawerProps {
  customer: CustomerRecord | null;
  onClose: () => void;
  onEdit: (customer: CustomerRecord) => void;
}

export function CustomerDetailDrawer({ customer, onClose, onEdit }: CustomerDetailDrawerProps) {
  const { info } = useToast();
  const historyQuery = trpc.customers.getHistory.useQuery(
    { id: customer?.id ?? "" },
    { enabled: Boolean(customer?.id) }
  );

  if (!customer) return null;
  const onCopied = (msg: string) => info(msg);
  const data = historyQuery.data;

  return (
    <DetailDrawer
      title={customer.name}
      subtitle={customer.companyName ?? undefined}
      statusBadge={<Badge variant="primary">{customer.customerType}</Badge>}
      onClose={onClose}
      footer={
        <>
          <Button type="button" variant="secondary" onClick={onClose}>{t("common.close")}</Button>
          <Button type="button" onClick={() => onEdit(customer)}>{t("common.edit")}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        {(customer.mobile || customer.phone) && <PhoneActionLink phone={customer.mobile ?? customer.phone ?? ""} onCopied={onCopied} />}
        {customer.email && <EmailActionLink email={customer.email} onCopied={onCopied} />}
        {customer.billingAddress && <AddressMapActionLink address={customer.billingAddress} onCopied={onCopied} />}
      </div>
      {historyQuery.isLoading ? (
        <div className="py-6 flex justify-center"><Spinner size="sm" /></div>
      ) : (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">{t("tradieWeb.linkedSitesTitle")}</h3>
            {(data?.sites ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">{t("tradieWeb.noLinkedCustomer")}</p>
            ) : (
              <ul className="space-y-1.5">
                {data?.sites.map((s) => (
                  <li key={s.linkId} className="rounded-lg border border-slate-200 p-2.5 text-xs">
                    <div className="font-semibold text-[#1B2B4B]">{s.site.name}</div>
                    <div className="text-slate-500">{[s.site.addressLine1, s.site.suburb, s.site.state].filter(Boolean).join(", ")}</div>
                  </li>
                ))}
              </ul>
            )}
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
