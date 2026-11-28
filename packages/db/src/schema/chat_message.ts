import { pgTable, uuid, text, jsonb } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { chatRooms } from "./chat_room.js";

/**
 * Chat message inside a room with optional reply thread and @mentions (Ring 2).
 */
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => chatRooms.id, { onDelete: "cascade" }),
  senderUserId: uuid("sender_user_id").notNull(),
  body: text("body").notNull(),
  replyToMessageId: uuid("reply_to_message_id"),
  mentionedUserIdsJson: jsonb("mentioned_user_ids_json").$type<string[]>().notNull().default([]),
  ...tenantAndTimestamps,
});
