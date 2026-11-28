"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Badge, Button, fmtDateMedium, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

const PROVIDERS: Array<{ id: "XERO" | "MYOB" | "QBO"; labelKey: string }> = [
  { id: "XERO", labelKey: "tradieSync.xeroLabel" },
  { id: "MYOB", labelKey: "tradieSync.myobLabel" },
  { id: "QBO", labelKey: "tradieSync.qboLabel" },
];

export function AccountingSyncSection() {
  const { success, error: showError } = useToast();
  const utils = trpc.useUtils();
  const connectionsQuery = trpc.accounting.listConnections.useQuery();
  const saveMut = trpc.accounting.saveConnection.useMutation({
    onSuccess: async () => {
      await utils.accounting.listConnections.invalidate();
    },
    onError: (err) => showError(err.message),
  });

  const connections = connectionsQuery.data ?? [];

  const handleConnect = async (provider: "XERO" | "MYOB" | "QBO", isSync: boolean) => {
    await saveMut.mutateAsync({
      provider,
      externalTenantId: `oauth-${provider.toLowerCase()}`,
      externalTenantName: provider,
      accessTokenEnc: "pending-oauth-exchange",
    });
    success(isSync ? t("tradieWeb.accountingSyncedSuccess") : t("tradieWeb.accountingConnectedSuccess"));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-[#1B2B4B]">{t("tradieWeb.accountingSyncTitle")}</h2>
        <p className="text-xs text-slate-500 mt-1">{t("tradieWeb.accountingSyncDesc")}</p>
      </div>
      <div className="divide-y divide-slate-200">
        {PROVIDERS.map((p) => {
          const conn = connections.find((c) => c.provider === p.id);
          return (
            <div key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-sm text-[#1B2B4B]">{t(p.labelKey)}</p>
                {conn?.lastSyncedAt && (
                  <p className="text-xs text-slate-500">{fmtDateMedium(conn.lastSyncedAt)}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {conn ? (
                  <>
                    <Badge variant="success">{t("tradieWeb.connectedLabel")}</Badge>
                    <Button type="button" size="sm" variant="secondary" loading={saveMut.isPending} onClick={() => void handleConnect(p.id, true)}>
                      {t("tradieWeb.manualSyncAction")}
                    </Button>
                  </>
                ) : (
                  <Button type="button" size="sm" loading={saveMut.isPending} onClick={() => void handleConnect(p.id, false)}>
                    {t("tradieWeb.connectAction")}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
