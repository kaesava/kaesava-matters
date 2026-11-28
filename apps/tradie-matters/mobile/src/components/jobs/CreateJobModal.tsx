import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import { useOfflineDraftAutoSave } from "@kaesava/mobile-core";
import {
  ChipSelect,
  MobileButton,
  MobileInput,
  MobileModalDialog,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { getActiveTenantId, trpc } from "../../lib/trpc";

interface CreateJobModalProps {
  visible: boolean;
  onClose: () => void;
}

export function CreateJobModal({ visible, onClose }: CreateJobModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [title, setTitle] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [priority, setPriority] = useState<"LOW" | "NORMAL" | "HIGH" | "URGENT">("NORMAL");

  const { loadDraft, clearDraft } = useOfflineDraftAutoSave({
    tenantId: getActiveTenantId() ?? "",
    userId: "",
    draftKey: "create-job-draft",
    value: { title, customerId, priority },
    enabled: visible,
  });

  useEffect(() => {
    if (!visible) return;
    void loadDraft().then((draft) => {
      if (draft?.title) setTitle(draft.title);
      if (draft?.customerId) setCustomerId(draft.customerId);
      if (draft?.priority) setPriority(draft.priority);
    });
  }, [visible, loadDraft]);

  const customersQuery = trpc.customers.list.useQuery({ limit: 50 }, { enabled: visible });
  const createMut = trpc.jobs.create.useMutation({
    onSuccess: async () => {
      await clearDraft();
      void utils.jobs.invalidate();
      toast.success(t("tradieMobile.jobCreatedToast"));
      setTitle("");
      setCustomerId("");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const customerOptions = (customersQuery.data ?? []).map((c) => ({ label: c.name, value: c.id }));
  const selectedCustomer = customerId || customerOptions[0]?.value || "";

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieJobs.createJobAction")}
      isDirty={Boolean(title.trim())}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          loading={createMut.isPending}
          disabled={!title.trim() || !selectedCustomer || createMut.isPending}
          onPress={() =>
            createMut.mutate({
              title: title.trim(),
              customerId: selectedCustomer,
              priority,
              status: "SCHEDULED",
            })
          }
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieJobs.jobTitleLabel")} value={title} onChangeText={setTitle} />
        {customerOptions.length > 0 ? (
          <ChipSelect
            label={t("tradieMobile.selectCustomerLabel")}
            value={selectedCustomer}
            onChange={setCustomerId}
            options={customerOptions}
          />
        ) : null}
        <ChipSelect
          label={t("tradieJobs.priorityLabel")}
          value={priority}
          onChange={(v) => setPriority(v as "LOW" | "NORMAL" | "HIGH" | "URGENT")}
          options={[
            { label: "Low", value: "LOW" },
            { label: "Normal", value: "NORMAL" },
            { label: "High", value: "HIGH" },
            { label: "Urgent", value: "URGENT" },
          ]}
        />
      </View>
    </MobileModalDialog>
  );
}
