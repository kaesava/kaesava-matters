import { chatMessages, type DbOrTx } from "@kaesava/db/rings/capabilities";
import type { ChatContext, OnMentionUsersCallback, PostChatMessageInputDto } from "../schemas.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseMentionedUserIds(
  body: string,
  explicitIds?: string[],
  mentionLookup?: Record<string, string>
): string[] {
  const found = new Set<string>(explicitIds ?? []);
  const matches = body.matchAll(/@([a-zA-Z0-9._-]+)/g);
  for (const match of matches) {
    const token = match[1];
    if (!token) continue;
    if (UUID_REGEX.test(token)) {
      found.add(token);
    } else if (mentionLookup && mentionLookup[token]) {
      found.add(mentionLookup[token]);
    }
  }
  return Array.from(found);
}

export async function postMessageCommand(
  db: DbOrTx,
  ctx: ChatContext,
  input: PostChatMessageInputDto,
  deps?: { onMentionUsers?: OnMentionUsersCallback }
) {
  const mentionedUserIds = parseMentionedUserIds(
    input.body,
    input.mentionedUserIds,
    input.mentionLookup
  );
  const now = new Date();
  const [message] = await db
    .insert(chatMessages)
    .values({
      id: crypto.randomUUID(),
      roomId: input.roomId,
      senderUserId: ctx.userId,
      body: input.body,
      replyToMessageId: input.replyToMessageId ?? null,
      mentionedUserIdsJson: mentionedUserIds,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  if (mentionedUserIds.length > 0 && deps?.onMentionUsers) {
    await deps.onMentionUsers({
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      roomId: input.roomId,
      messageId: message.id,
      senderUserId: ctx.userId,
      mentionedUserIds,
      body: input.body,
    });
  }
  return message;
}
