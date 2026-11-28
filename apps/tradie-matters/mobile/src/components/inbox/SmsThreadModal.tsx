import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import {
  DESIGN_TOKENS,
  MobileButton,
  MobileInput,
  MobileModalDialog,
  useMobileToast,
} from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

export interface SmsThreadTarget {
  title: string;
  phone: string;
  jobId?: string;
}

interface SmsThreadModalProps {
  visible: boolean;
  target: SmsThreadTarget | null;
  tradieName: string;
  onClose: () => void;
}

export function SmsThreadModal({ visible, target, tradieName, onClose }: SmsThreadModalProps) {
  const toast = useMobileToast();
  const utils = trpc.useUtils();
  const [reply, setReply] = useState("");
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const sendMut = trpc.sms.sendOnMyWay.useMutation();

  const handleSend = async () => {
    const trimmed = reply.trim();
    if (!trimmed || !target?.phone || !target.jobId) {
      toast.info(t("tradieMobile.smsNoPhoneToast"));
      return;
    }
    try {
      await sendMut.mutateAsync({
        jobId: target.jobId,
        recipientPhone: target.phone,
        originLat: -37.8136,
        originLng: 144.9631,
        destLat: -37.8136,
        destLng: 144.9631,
        tradieName,
      });
      setSentMessages((prev) => [...prev, trimmed]);
      setReply("");
      void utils.sms.invalidate();
      toast.success(t("tradieMobile.smsSentToast"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tradieMobile.smsNoPhoneToast"));
    }
  };

  return (
    <MobileModalDialog visible={visible} onClose={onClose} title={target?.title || t("tradieMobile.inboxTitle")} isDirty={Boolean(reply.trim())}>
      <View style={styles.container}>
        <Text style={styles.phone}>{target?.phone || t("tradieMobile.smsNoPhoneToast")}</Text>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {sentMessages.map((msg, idx) => (
            <View key={`${idx}-${msg.slice(0, 8)}`} style={styles.bubble}>
              <Text style={styles.body}>{msg}</Text>
            </View>
          ))}
        </ScrollView>
        <MobileInput value={reply} onChangeText={setReply} placeholder={t("tradieMobile.smsReplyPlaceholder")} />
        <MobileButton title={t("chat.sendCta")} loading={sendMut.isPending} disabled={!reply.trim()} onPress={() => void handleSend()} />
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, paddingBottom: 12 },
  phone: { fontSize: 12, fontWeight: "600", color: DESIGN_TOKENS.colors.textMuted },
  list: { maxHeight: 220 },
  listContent: { gap: 8 },
  bubble: { backgroundColor: DESIGN_TOKENS.colors.slate[100], borderRadius: 10, padding: 10 },
  body: { fontSize: 14, color: DESIGN_TOKENS.colors.textPrimary },
});