import React, { useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  MobileButton,
  MobileFormLabel,
  MobileInput,
  MobileModalDialog,
  MobileSignaturePad,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";
import type { QuoteOptionGroupDto } from "../../lib/trpc-types";

interface QuoteSignAcceptModalProps {
  visible: boolean;
  quoteId: string;
  optionGroups: QuoteOptionGroupDto[];
  onClose: () => void;
}

export function QuoteSignAcceptModal({ visible, quoteId, optionGroups, onClose }: QuoteSignAcceptModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [signerName, setSignerName] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(optionGroups[0]?.id ?? "");
  const [paths, setPaths] = useState<string[]>([]);

  const sendMut = trpc.quotes.send.useMutation();
  const acceptMut = trpc.portalQuote.accept.useMutation({
    onSuccess: () => {
      void utils.quotes.invalidate();
      toast.success(t("tradieMobile.quoteAcceptedToast"));
      setSignerName("");
      setPaths([]);
      onClose();
    },
  });

  const handleAccept = async () => {
    const sent = await sendMut.mutateAsync({ id: quoteId });
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 140">${paths.map((d) => `<path d="${d}" stroke="#1B2B4B" fill="none"/>`).join("")}</svg>`;
    await acceptMut.mutateAsync({
      rawToken: sent.rawToken,
      signerName: signerName.trim(),
      signatureSvg: svg,
      selectedOptionGroupId: selectedGroupId || null,
    });
  };

  const isPending = sendMut.isPending || acceptMut.isPending;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieQuotes.signToAccept")}
      isDirty={Boolean(signerName.trim() || paths.length > 0)}
      footer={
        <MobileButton
          title={t("tradieQuotes.acceptQuote")}
          loading={isPending}
          disabled={!signerName.trim() || paths.length === 0 || isPending}
          onPress={() => void handleAccept()}
        />
      }
    >
      <View style={{ gap: 12 }}>
        {optionGroups.length > 0 ? (
          <>
            <MobileFormLabel label={t("tradieQuotes.goodBetterBest")} />
            <ChipSelect
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              options={optionGroups.map((g) => ({ label: g.name, value: g.id }))}
            />
          </>
        ) : null}
        <MobileInput label={t("tradieQuotes.signerName")} value={signerName} onChangeText={setSignerName} />
        <MobileFormLabel label={t("tradieMobile.customerSignatureLabel")} />
        <MobileSignaturePad onChange={setPaths} height={140} />
      </View>
    </MobileModalDialog>
  );
}
