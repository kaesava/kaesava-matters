import { and, eq, isNull } from "drizzle-orm";
import { chatMembers, chatRooms, type DbOrTx } from "@kaesava/db/rings/capabilities";
import type { ChatContext, CreateChatRoomInputDto } from "../schemas.js";

export async function createRoomCommand(
  db: DbOrTx,
  ctx: ChatContext,
  input: CreateChatRoomInputDto
) {
  const existing = await db
    .select()
    .from(chatRooms)
    .where(
      and(
        eq(chatRooms.tenantId, ctx.tenantId),
        eq(chatRooms.appId, ctx.appId),
        eq(chatRooms.entityType, input.entityType),
        eq(chatRooms.entityId, input.entityId),
        isNull(chatRooms.archivedAt)
      )
    )
    .limit(1);

  if (existing[0]) return existing[0];

  const now = new Date();
  const roomId = crypto.randomUUID();
  const [room] = await db
    .insert(chatRooms)
    .values({
      id: roomId,
      entityType: input.entityType,
      entityId: input.entityId,
      title: input.title,
      isPinned: input.isPinned ?? false,
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    })
    .returning();

  const uniqueMembers = Array.from(new Set([ctx.userId, ...(input.memberUserIds ?? [])]));
  await db.insert(chatMembers).values(
    uniqueMembers.map((userId) => ({
      id: crypto.randomUUID(),
      roomId,
      userId,
      role: userId === ctx.userId ? "OWNER" : "MEMBER",
      tenantId: ctx.tenantId,
      appId: ctx.appId,
      createdAt: now,
      createdBy: ctx.userId,
      updatedAt: now,
      updatedBy: ctx.userId,
    }))
  );
  return room;
}
