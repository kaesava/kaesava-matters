"use client";

import React from "react";
import { t } from "@kaesava/i18n";
import { Button, ModalDialog, useToast } from "@kaesava/ui/web";
import { trpc } from "../../../../lib/trpc";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function SmsTopUpModal({ isOpen, onClose }: Props) {
  const { error: showError } = useToast();
  const checkoutMut = trpc.createCheckoutSession.useMutation({
    onSuccess: (res) => {
      if (res.url) window.location.assign(res.url);
      onClose();
    },
    onError: (err) => showError(err.message),
  });

  const handleBuy = (packKey: "sms_pack_100" | "sms_pack_500") => {
    const origin = window.location.origin;
    checkoutMut.mutate({
      purchaseMode: "payment",
      packKey,
      successUrl: `${origin}/dashboard/inbox`,
      cancelUrl: `${origin}/dashboard/inbox`,
    });
  };

  return (
    <ModalDialog isOpen={isOpen} onClose={onClose} title={t("tradieWeb.topUpModalTitle")}>
      <div className="space-y-3">
        <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-[#1B2B4B] text-sm">{t("tradieSms.buyPack100")}</p>
            <p className="text-xs text-slate-500">{t("tradieWeb.topUpPack100Desc")}</p>
          </div>
          <Button type="button" size="sm" loading={checkoutMut.isPending} onClick={() => handleBuy("sms_pack_100")}>
            {t("tradieWeb.buyPackAction")}
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-[#1B2B4B] text-sm">{t("tradieSms.buyPack500")}</p>
            <p className="text-xs text-slate-500">{t("tradieWeb.topUpPack500Desc")}</p>
          </div>
          <Button type="button" size="sm" loading={checkoutMut.isPending} onClick={() => handleBuy("sms_pack_500")}>
            {t("tradieWeb.buyPackAction")}
          </Button>
        </div>
      </div>
    </ModalDialog>
  );
}
