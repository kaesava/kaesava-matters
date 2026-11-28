import { and, eq, gt, isNull, ne, sql } from "drizzle-orm";
import { chatMembers, chatMessages, chatReads, type DbOrTx } from "@kaesava/db/rings/capabilities";
import type { ChatContext } from "../schemas.js";

export interface RoomUnreadCount {
  roomId: string;
  unreadCount: number;
}

export async function getUnreadCountsQuery(
  db: DbOrTx,
  ctx: ChatContext
): Promise<RoomUnreadCount[]> {
  const memberships = await db
    .select({ roomId: chatMembers.roomId })
    .from(chatMembers)
    .where(
      and(
        eq(chatMembers.tenantId, ctx.tenantId),
        eq(chatMembers.appId, ctx.appId),
        eq(chatMembers.userId, ctx.userId),
        isNull(chatMembers.archivedAt)
      )
    );

  const reads = await db
    .select({ roomId: chatReads.roomId, lastReadAt: chatReads.lastReadAt })
    .from(chatReads)
    .where(
      and(
        eq(chatReads.tenantId, ctx.tenantId),
        eq(chatReads.appId, ctx.appId),
        eq(chatReads.userId, ctx.userId),
        isNull(chatReads.archivedAt)
      )
    );

  const readMap = new Map(reads.map((r) => [r.roomId, r.lastReadAt]));
  const results: RoomUnreadCount[] = [];

  for (const m of memberships) {
    const lastReadAt = readMap.get(m.roomId) ?? new Date(0);
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.tenantId, ctx.tenantId),
          eq(chatMessages.appId, ctx.appId),
          eq(chatMessages.roomId, m.roomId),
          ne(chatMessages.senderUserId, ctx.userId),
          gt(chatMessages.createdAt, lastReadAt),
          isNull(chatMessages.archivedAt)
        )
      );
    results.push({ roomId: m.roomId, unreadCount: row?.count ?? 0 });
  }
  return results;
}
