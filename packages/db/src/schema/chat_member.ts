import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { chatRooms } from "./chat_room.js";

/**
 * Chat room membership record (Ring 2).
 */
export const chatMembers = pgTable("chat_members", {
  id: uuid("id").defaultRandom().primaryKey(),
  roomId: uuid("room_id")
    .notNull()
    .references(() => chatRooms.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  role: varchar("role", { length: 24 }).notNull().default("MEMBER"),
  ...tenantAndTimestamps,
});
