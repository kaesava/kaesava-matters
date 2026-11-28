import type { AnyProcedure } from "@trpc/server";
import { createChatRouter, type ChatProcedureBuilder } from "@kaesava/capability-chat/router";
import { inngest } from "../inngest/client.js";
import { tenantProcedure } from "../trpc/trpc.js";

const proc = tenantProcedure as unknown as ChatProcedureBuilder<AnyProcedure>;

export const chatRouter = createChatRouter<AnyProcedure>({
  tenantProcedure: proc,
  onMentionUsers: async ({ tenantId, roomId, mentionedUserIds, body }) => {
    for (const userId of mentionedUserIds) {
      await inngest
        .send({
          name: "notification/send-push",
          data: {
            userId,
            tenantId,
            title: "You were mentioned in chat",
            body: body.slice(0, 120),
            data: { roomId, route: "/(app)/jobs/" + roomId },
          },
        })
        .catch(() => undefined);
    }
  },
});
