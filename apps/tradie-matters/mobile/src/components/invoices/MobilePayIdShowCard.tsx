import React from "react";
import { Share } from "react-native";
import { t } from "@kaesava/i18n";
import {
  MobileButton,
  ReadOnlyField,
  SettingsCard,
  useMobileToast,
} from "@kaesava/ui/mobile";
import type { BusinessProfileDto } from "../../lib/trpc-types";

interface MobilePayIdShowCardProps {
  profile: BusinessProfileDto | null | undefined;
  invoiceNumber: string;
  balanceDue: string;
}

export function MobilePayIdShowCard({ profile, invoiceNumber, balanceDue }: MobilePayIdShowCardProps) {
  const toast = useMobileToast();
  if (!profile) return null;

  const payId = (profile as { payIdValue?: string | null }).payIdValue || profile.abn || "";
  const bsb = profile.bankBsb || "";
  const acct = profile.bankAccountNumber || "";
  if (!payId && !bsb && !acct) return null;

  const handleShare = async () => {
    const lines = [
      profile.businessName || "",
      payId ? `${t("tradieMobile.payIdAbnLabel")}: ${payId}` : "",
      bsb ? `${t("tradieMobile.bsbLabel")}: ${bsb}` : "",
      acct ? `${t("tradieMobile.accountNumberLabel")}: ${acct}` : "",
      `${invoiceNumber} · ${balanceDue}`,
    ].filter(Boolean);
    toast.info(t("tradieMobile.payDetailsCopiedToast"));
    await Share.share({ message: lines.join("\n") });
  };

  return (
    <SettingsCard title={t("tradieMobile.payIdCardTitle")}>
      {payId ? <ReadOnlyField label={t("tradieMobile.payIdAbnLabel")} value={payId} /> : null}
      {bsb ? <ReadOnlyField label={t("tradieMobile.bsbLabel")} value={bsb} /> : null}
      {acct ? <ReadOnlyField label={t("tradieMobile.accountNumberLabel")} value={acct} /> : null}
      <MobileButton title={t("tradieMobile.copyPayDetailsAction")} variant="secondary" onPress={() => void handleShare()} />
    </SettingsCard>
  );
}
