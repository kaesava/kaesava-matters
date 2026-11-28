"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { TRADE_STARTER_PACKS, type TradePackKey } from "@tradie-matters/capability-operations";
import { Button, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

export interface StarterPackPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StarterPackPickerModal({ isOpen, onClose }: StarterPackPickerModalProps) {
  const { success } = useToast();
  const utils = trpc.useUtils();
  const [activePack, setActivePack] = useState<TradePackKey | null>(null);
  const installMut = trpc.pricebook.installStarterPack.useMutation({
    onSuccess: () => utils.pricebook.invalidate(),
  });

  const handleInstall = async (packKey: TradePackKey) => {
    setActivePack(packKey);
    const res = await installMut.mutateAsync({ packKey });
    setActivePack(null);
    success(t("tradieWeb.starterPackInstalled", { count: String(res.insertedCount) }));
    onClose();
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieCrm.installStarterPackAction")} subtitle={t("tradieWeb.starterPackSubtitle")}>
      <div className="space-y-2.5">
        {Object.values(TRADE_STARTER_PACKS).map((pack) => (
          <div key={pack.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3.5 hover:border-[#2563eb]/40">
            <div>
              <div className="text-sm font-bold text-[#1B2B4B]">{pack.title}</div>
              <div className="text-xs text-slate-500">{t("tradieWeb.starterPackItemsCount", { count: String(pack.items.length) })}</div>
            </div>
            <Button type="button" size="sm" loading={installMut.isPending && activePack === pack.key} disabled={installMut.isPending} onClick={() => handleInstall(pack.key)}>
              {t("tradieWeb.installAction")}
            </Button>
          </div>
        ))}
      </div>
    </ModalDialog>
  );
}
