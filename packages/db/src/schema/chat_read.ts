import { pgTable, uuid, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { chatRooms } from "./chat_room.js";

/**
 * Per-user read cursor for a chat room (Ring 2).
 */
export const chatReads = pgTable("chat_reads", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  lastReadAt: timestamp("last_read_at", { withTimezone: true }).notNull().defaultNow(),
  ...tenantAndTimestamps,
});
