"use client";

import React, { useEffect, useRef, useState } from "react";
import { t } from "@kaesava/i18n";
import { ChatThreadPanel } from "@kaesava/capability-chat/web";
import { Spinner, fmtDateMedium } from "@kaesava/ui/web";
import { trpc } from "../../../../../lib/trpc";

interface Props {
  jobId: string;
  jobTitle: string;
}

export function JobInternalChatTab({ jobId, jobTitle }: Props) {
  const utils = trpc.useUtils();
  const [roomId, setRoomId] = useState<string | null>(null);
  const initRef = useRef(false);

  const createRoomMut = trpc.chat.createRoom.useMutation({
    onSuccess: (room) => setRoomId(room.id),
  });
  const membersQuery = trpc.listTenantMembers.useQuery();
  const messagesQuery = trpc.chat.listRoomMessages.useQuery(
    { roomId: roomId ?? "", limit: 100 },
    { enabled: Boolean(roomId) }
  );
  const postMut = trpc.chat.postMessage.useMutation({
    onSuccess: async () => {
      if (roomId) await utils.chat.listRoomMessages.invalidate({ roomId, limit: 100 });
    },
  });
  const markReadMut = trpc.chat.markRoomRead.useMutation();

  useEffect(() => {
    if (initRef.current || !jobId) return;
    initRef.current = true;
    createRoomMut.mutate({ entityType: "JOB", entityId: jobId, title: jobTitle });
  }, [jobId, jobTitle, createRoomMut]);

  if (!roomId || messagesQuery.isLoading) {
    return <div className="py-8 flex justify-center"><Spinner size="md" /></div>;
  }

  const nameByUserId = new Map((membersQuery.data ?? []).map((m) => [m.userId, m.displayName || m.email]));
  const items = (messagesQuery.data ?? []).map((m) => ({
    id: m.id,
    senderName: nameByUserId.get(m.senderUserId) ?? m.senderUserId.slice(0, 8),
    body: m.body,
    createdAtLabel: fmtDateMedium(m.createdAt),
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        {t("tradieWeb.internalChatNotice")}
      </p>
      <ChatThreadPanel
        title={t("tradieWeb.tabInternalChat")}
        messages={items}
        isSending={postMut.isPending}
        onSendMessage={async (body) => { await postMut.mutateAsync({ roomId, body }); }}
        onMarkRead={async () => { await markReadMut.mutateAsync({ roomId }); }}
      />
    </div>
  );
}
