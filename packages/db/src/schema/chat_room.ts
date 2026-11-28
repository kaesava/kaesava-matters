import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Reusable entity-scoped chat room (Ring 2).
 */
export const chatRooms = pgTable("chat_rooms", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  entityId: uuid("entity_id").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  isPinned: boolean("is_pinned").notNull().default(false),
  ...tenantAndTimestamps,
});
