import { and, eq, isNull } from "drizzle-orm";
import { chatReads, type DbOrTx } from "@kaesava/db/rings/capabilities";
import type { ChatContext, MarkRoomReadInputDto } from "../schemas.js";

export async function markRoomReadCommand(
  db: DbOrTx,
  ctx: ChatContext,
  input: MarkRoomReadInputDto
) {
  const now = new Date();
  const existing = await db
    .select()
    .from(chatReads)
    .where(
      and(
        eq(chatReads.tenantId, ctx.tenantId),
        eq(chatReads.appId, ctx.appId),
        eq(chatReads.roomId, input.roomId),
        eq(chatReads.userId, ctx.userId),
        isNull(chatReads.archivedAt)
      )
    )
    .limit(1);

  if (existing[0]) {
    const [updated] = await db
      .update(chatReads)
      .set({ lastReadAt: now, updatedAt: now, updatedBy: ctx.userId })
      .where(eq(chatReads.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(chatReads)
    .values({
      id: crypto.randomUUID(),
      roomId: input.roomId,
      userId: ctx.userId,
      lastReadAt: now,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();
  return created;
}
