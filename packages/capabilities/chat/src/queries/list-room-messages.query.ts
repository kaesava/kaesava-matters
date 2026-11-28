import { and, asc, eq, isNull } from "drizzle-orm";
import { chatMessages, type DbOrTx } from "@kaesava/db/rings/capabilities";
import type { ChatContext, ListRoomMessagesInputDto } from "../schemas.js";

export async function listRoomMessagesQuery(
  db: DbOrTx,
  ctx: ChatContext,
  input: ListRoomMessagesInputDto
) {
  return db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.tenantId, ctx.tenantId),
        eq(chatMessages.appId, ctx.appId),
        eq(chatMessages.roomId, input.roomId),
        isNull(chatMessages.archivedAt)
      )
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(input.limit ?? 100);
}
