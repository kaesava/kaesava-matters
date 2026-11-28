import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { t } from "@kaesava/i18n";
import { MobileButton, MobileInput, MobileModalDialog } from "@kaesava/ui/mobile";

export interface MobileChatMessageItem {
  id: string;
  senderName: string;
  body: string;
  createdAtLabel: string;
}

export interface MobileChatThreadSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  messages: MobileChatMessageItem[];
  isSending?: boolean;
  onSendMessage: (body: string) => Promise<void> | void;
}

export function MobileChatThreadSheet({
  visible,
  onClose,
  title,
  messages,
  isSending = false,
  onSendMessage,
}: MobileChatThreadSheetProps) {
  const [body, setBody] = useState("");

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || isSending) return;
    await onSendMessage(trimmed);
    setBody("");
  };

  return (
    <MobileModalDialog
      visible={visible}
      onClose={onClose}
      title={title || t("chat.title")}
      isDirty={Boolean(body.trim())}
    >
      <View style={styles.container}>
        <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
          {messages.length === 0 ? (
            <Text style={styles.empty}>{t("chat.emptyState")}</Text>
          ) : (
            messages.map((msg) => (
              <View key={msg.id} style={styles.bubble}>
                <View style={styles.metaRow}>
                  <Text style={styles.sender}>{msg.senderName}</Text>
                  <Text style={styles.time}>{msg.createdAtLabel}</Text>
                </View>
                <Text style={styles.body}>{msg.body}</Text>
              </View>
            ))
          )}
        </ScrollView>
        <View style={styles.composer}>
          <MobileInput
            value={body}
            onChangeText={setBody}
            placeholder={t("chat.messagePlaceholder")}
          />
          <MobileButton
            title={t("chat.sendCta")}
            onPress={handleSend}
            loading={isSending}
            disabled={!body.trim()}
          />
        </View>
      </View>
    </MobileModalDialog>
  );
}

const styles = StyleSheet.create({
  container: { gap: 12, paddingBottom: 12 },
  list: { maxHeight: 320 },
  listContent: { gap: 8 },
  empty: { fontSize: 13, color: "#64748B", paddingVertical: 12 },
  bubble: { backgroundColor: "#F8FAFC", borderRadius: 10, padding: 10, gap: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sender: { fontSize: 12, fontWeight: "600", color: "#1B2B4B" },
  time: { fontSize: 12, color: "#64748B" },
  body: { fontSize: 14, color: "#0F172A" },
  composer: { gap: 8 },
});
