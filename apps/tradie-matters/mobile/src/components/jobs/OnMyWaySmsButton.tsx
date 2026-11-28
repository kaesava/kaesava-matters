import React from "react";
import { t } from "@kaesava/i18n";
import { MobileButton, useMobileToast } from "@kaesava/ui/mobile";
import { getCurrentCoordinates } from "../../lib/location";
import { trpc } from "../../lib/trpc";

interface OnMyWaySmsButtonProps {
  jobId: string;
  tradieName: string;
}

export function OnMyWaySmsButton({ jobId, tradieName }: OnMyWaySmsButtonProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const detailQuery = trpc.jobs.getDetail.useQuery({ id: jobId }, { enabled: Boolean(jobId) });
  const sendMut = trpc.sms.sendOnMyWay.useMutation();

  const handleSend = async () => {
    const phone = detailQuery.data?.customer?.mobile || detailQuery.data?.customer?.phone;
    if (!phone) {
      toast.info(t("tradieMobile.smsNoPhoneToast"));
      return;
    }
    try {
      const coords = await getCurrentCoordinates();
      const site = detailQuery.data?.site as { latitude?: number | null; longitude?: number | null } | null | undefined;
      const destLat = site?.latitude ?? coords?.lat ?? -37.8136;
      const destLng = site?.longitude ?? coords?.lng ?? 144.9631;
      const res = await sendMut.mutateAsync({
        jobId,
        recipientPhone: phone,
        originLat: coords?.lat ?? destLat,
        originLng: coords?.lng ?? destLng,
        destLat,
        destLng,
        tradieName: tradieName || t("tradieMobile.appName"),
      });
      void utils.sms.invalidate();
      toast.success(t("tradieMobile.onMyWaySentToast", { minutes: String(res.etaMinutes) }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tradieMobile.smsNoPhoneToast"));
    }
  };

  return (
    <MobileButton
      title={t("tradieSms.onMyWayCta")}
      variant="secondary"
      loading={sendMut.isPending}
      disabled={detailQuery.isLoading || sendMut.isPending}
      onPress={() => void handleSend()}
    />
  );
}