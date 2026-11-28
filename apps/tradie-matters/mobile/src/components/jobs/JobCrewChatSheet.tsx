import React, { useEffect, useMemo, useState } from "react";
import { t } from "@kaesava/i18n";
import { MobileChatThreadSheet, type MobileChatMessageItem } from "@kaesava/capability-chat/mobile";
import { fmtDateTime } from "@kaesava/ui/mobile";
import { trpc } from "../../lib/trpc";

interface JobCrewChatSheetProps {
  visible: boolean;
  jobId: string;
  jobNumber: string;
  onClose: () => void;
}

export function JobCrewChatSheet({ visible, jobId, jobNumber, onClose }: JobCrewChatSheetProps) {
  const utils = trpc.useUtils();
  const [roomId, setRoomId] = useState<string | null>(null);
  const tenantQuery = trpc.getTenant.useQuery(undefined, { enabled: visible });
  const createRoomMut = trpc.chat.createRoom.useMutation();
  const markReadMut = trpc.chat.markRoomRead.useMutation();
  const postMut = trpc.chat.postMessage.useMutation();

  useEffect(() => {
    if (!visible || roomId) return;
    void createRoomMut
      .mutateAsync({ entityType: "JOB", entityId: jobId, title: `${jobNumber} · ${t("chat.title")}` })
      .then((room) => {
        setRoomId(room.id);
        void markReadMut.mutateAsync({ roomId: room.id }).catch(() => undefined);
      });
  }, [visible, roomId, jobId, jobNumber]);

  const messagesQuery = trpc.chat.listRoomMessages.useQuery(
    { roomId: roomId ?? "" },
    { enabled: visible && Boolean(roomId) }
  );

  const { memberNameMap, mentionLookup } = useMemo(() => {
    const names = new Map<string, string>();
    const lookup: Record<string, string> = {};
    for (const m of tenantQuery.data?.members ?? []) {
      const uid = m.userId ?? m.id;
      const label = m.name || m.email || uid;
      names.set(uid, label);
      if (m.name) lookup[m.name.toLowerCase().replace(/\s+/g, "")] = uid;
      if (m.email) lookup[m.email.split("@")[0]!.toLowerCase()] = uid;
    }
    return { memberNameMap: names, mentionLookup: lookup };
  }, [tenantQuery.data?.members]);

  const items: MobileChatMessageItem[] = useMemo(
    () =>
      (messagesQuery.data ?? []).map((msg) => ({
        id: msg.id,
        senderName: memberNameMap.get(msg.senderUserId) ?? msg.senderUserId.slice(0, 8),
        body: msg.body,
        createdAtLabel: fmtDateTime(msg.createdAt),
      })),
    [messagesQuery.data, memberNameMap]
  );

  const handleSend = async (body: string) => {
    if (!roomId) return;
    await postMut.mutateAsync({ roomId, body, mentionLookup });
    void utils.chat.listRoomMessages.invalidate({ roomId });
  };

  return (
    <MobileChatThreadSheet
      visible={visible}
      onClose={onClose}
      title={`${t("chat.title")} (${t("tradieMobile.crewChatBadge")})`}
      messages={items}
      isSending={postMut.isPending}
      onSendMessage={handleSend}
    />
  );
}