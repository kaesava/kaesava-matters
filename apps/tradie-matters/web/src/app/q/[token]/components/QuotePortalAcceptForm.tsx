"use client";

import React, { useState } from "react";
import { t } from "@kaesava/i18n";
import { Button, FormLabel, Input, SignaturePad } from "@kaesava/ui/web";

export function QuotePortalAcceptForm({
  onAccept,
  onDecline,
  isPending,
}: {
  onAccept: (signerName: string, signatureSvg: string) => void;
  onDecline: () => void;
  isPending: boolean;
}) {
  const [signerName, setSignerName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
      <h2 className="text-base font-bold text-[#1B2B4B]">{t("tradieQuotes.signToAccept")}</h2>
      <div>
        <FormLabel htmlFor="qp-signer" required>{t("tradieQuotes.signerName")}</FormLabel>
        <Input id="qp-signer" value={signerName} onChange={(e) => setSignerName(e.target.value)} required />
      </div>
      <SignaturePad onChange={setSignatureData} clearLabel={t("common.clear")} disabled={isPending} />
      <div className="flex flex-wrap justify-between gap-3 pt-2">
        <Button type="button" variant="secondary" disabled={isPending} onClick={onDecline}>
          {t("tradieQuotes.declineQuote")}
        </Button>
        <Button
          type="button"
          disabled={!signerName.trim() || !signatureData || isPending}
          onClick={() => signatureData && onAccept(signerName.trim(), signatureData)}
        >
          {t("tradieQuotes.acceptQuote")}
        </Button>
      </div>
    </section>
  );
}
