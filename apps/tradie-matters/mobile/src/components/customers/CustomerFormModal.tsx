import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  MobileButton,
  MobileInput,
  MobileModalDialog,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export interface CustomerFormInitial {
  id: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  notes?: string | null;
}

interface CustomerFormModalProps {
  visible: boolean;
  onClose: () => void;
  initial?: CustomerFormInitial | null;
}

export function CustomerFormModal({ visible, onClose, initial }: CustomerFormModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setName(initial?.name ?? "");
    setCompanyName(initial?.companyName ?? "");
    setEmail(initial?.email ?? "");
    setMobile(initial?.mobile ?? initial?.phone ?? "");
    setNotes(initial?.notes ?? "");
  }, [initial, visible]);

  const createMut = trpc.customers.create.useMutation({
    onSuccess: () => {
      void utils.customers.invalidate();
      toast.success(t("tradieMobile.customerSavedToast"));
      onClose();
    },
  });
  const updateMut = trpc.customers.update.useMutation({
    onSuccess: () => {
      void utils.customers.invalidate();
      toast.success(t("tradieMobile.customerSavedToast"));
      onClose();
    },
  });

  const isPending = createMut.isPending || updateMut.isPending;
  const handleSave = () => {
    const payload = {
      name: name.trim(),
      customerType: "RESIDENTIAL" as const,
      companyName: companyName.trim() || null,
      email: email.trim() || null,
      mobile: mobile.trim() || null,
      notes: notes.trim() || null,
    };
    if (initial?.id) updateMut.mutate({ id: initial.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={initial ? t("tradieCrm.editCustomerAction") : t("tradieCrm.addCustomerAction")}
      isDirty={name.trim().length > 0 && name !== (initial?.name ?? "")}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          onPress={handleSave}
          loading={isPending}
          disabled={!name.trim() || isPending}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieCrm.customerNameLabel")} value={name} onChangeText={setName} />
        <MobileInput label={t("tradieCrm.companyNameLabel")} value={companyName} onChangeText={setCompanyName} />
        <MobileInput label={t("tradieCrm.emailLabel")} value={email} onChangeText={setEmail} keyboardType="email-address" />
        <MobileInput label={t("tradieCrm.mobileLabel")} value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <MobileInput label={t("tradieCrm.notesLabel")} value={notes} onChangeText={setNotes} multiline />
      </View>
    </MobileModalDialog>
  );
}
