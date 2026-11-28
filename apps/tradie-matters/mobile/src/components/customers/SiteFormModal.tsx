import React, { useState } from "react";
import { View } from "react-native";
import { t } from "@kaesava/i18n";
import type { AddressValue } from "@kaesava/capability-geo";
import { MobileSmartAddressField } from "@kaesava/capability-geo/mobile";
import { MobileButton, MobileInput, MobileModalDialog, useMobileToast } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface SiteFormModalProps {
  visible: boolean;
  customerId: string;
  onClose: () => void;
}

const EMPTY_ADDRESS: AddressValue = {
  streetLine: "",
  suburb: "",
  state: "",
  postcode: "",
  country: "AU",
};

export function SiteFormModal({ visible, customerId, onClose }: SiteFormModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [name, setName] = useState("");
  const [address, setAddress] = useState<AddressValue>(EMPTY_ADDRESS);
  const [accessNotes, setAccessNotes] = useState("");
  const [keySafeCode, setKeySafeCode] = useState("");

  const createMut = trpc.sites.create.useMutation({
    onSuccess: () => {
      void utils.customers.invalidate();
      toast.success(t("tradieMobile.siteSavedToast"));
      setName("");
      setAddress(EMPTY_ADDRESS);
      setAccessNotes("");
      setKeySafeCode("");
      onClose();
    },
  });

  const handleSave = () => {
    createMut.mutate({
      name: name.trim(),
      addressLine1: address.streetLine.trim(),
      suburb: address.suburb.trim() || null,
      state: address.state.trim() || null,
      postcode: address.postcode.trim() || null,
      country: address.country.trim() || "AU",
      latitude: address.lat !== undefined ? address.lat.toFixed(6) : null,
      longitude: address.lng !== undefined ? address.lng.toFixed(6) : null,
      accessNotes: accessNotes.trim() || null,
      keySafeCode: keySafeCode.trim() || null,
      customerId,
    });
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={t("tradieCrm.addSiteAction")}
      isDirty={Boolean(name.trim() || address.streetLine.trim())}
      footer={
        <MobileButton
          title={t("tradieMobile.saveAction")}
          onPress={handleSave}
          loading={createMut.isPending}
          disabled={!name.trim() || !address.streetLine.trim() || createMut.isPending}
        />
      }
    >
      <View style={{ gap: 12 }}>
        <MobileInput label={t("tradieCrm.siteNameLabel")} value={name} onChangeText={setName} />
        <MobileSmartAddressField
          value={address}
          onChange={setAddress}
          onSearch={(query) => utils.geo.searchAddresses.fetch({ query })}
          required
        />
        <MobileInput label={t("tradieCrm.keySafeCodeLabel")} value={keySafeCode} onChangeText={setKeySafeCode} />
        <MobileInput label={t("tradieCrm.accessNotesLabel")} value={accessNotes} onChangeText={setAccessNotes} multiline />
      </View>
    </MobileModalDialog>
  );
}
