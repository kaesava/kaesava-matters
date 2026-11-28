import React, { useState } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import { t } from "@kaesava/i18n";
import {
  ChipSelect,
  MobileButton,
  MobileFormLabel,
  MobileModalDialog,
  SwitchRow,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface ConvertJobInvoiceSheetProps {
  visible: boolean;
  initialJobId?: string;
  onClose: () => void;
}

export function ConvertJobInvoiceSheet({ visible, initialJobId, onClose }: ConvertJobInvoiceSheetProps) {
  const router = useRouter();
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [jobId, setJobId] = useState(initialJobId ?? "");
  const [sendImmediately, setSendImmediately] = useState(false);
  const [allowCardPayment, setAllowCardPayment] = useState(true);

  const jobsQuery = trpc.jobs.list.useQuery({ limit: 30 }, { enabled: visible && !initialJobId });
  const convertMut = trpc.invoices.convertJob.useMutation({
    onSuccess: (inv) => {
      void utils.invoices.invalidate();
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.invoiceCreatedToast"));
      onClose();
      router.push(`/(app)/invoices/${inv.id}` as Href);
    },
  });

  const activeJobId = initialJobId || jobId;

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieInvoices.convertJobToInvoice")}
      footer={
        <MobileButton
          title={t("tradieInvoices.convertJobToInvoice")}
          loading={convertMut.isPending}
          disabled={!activeJobId || convertMut.isPending}
          onPress={() =>
            convertMut.mutate({
              jobId: activeJobId,
              sendImmediately,
              allowCardPayment,
            })
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        {!initialJobId ? (
          <>
            <MobileFormLabel label={t("tradieMobile.selectJobLabel")} />
            <ChipSelect
              value={jobId}
              onChange={setJobId}
              options={(jobsQuery.data ?? []).map((j) => ({ label: `${j.jobNumber} · ${j.title}`, value: j.id }))}
            />
          </>
        ) : null}
        <SwitchRow label={t("tradieMobile.sendImmediatelyLabel")} value={sendImmediately} onValueChange={setSendImmediately} />
        <SwitchRow label={t("tradieMobile.allowCardPaymentLabel")} value={allowCardPayment} onValueChange={setAllowCardPayment} />
      </View>
    </MobileModalDialog>
  );
}
