import { pgTable, varchar, timestamp } from "drizzle-orm/pg-core";

export const processedWebhooks = pgTable("processed_webhooks", {
  eventId: varchar("event_id", { length: 255 }).primaryKey(),
  processedAt: timestamp("processed_at", { mode: "date" }).defaultNow().notNull(),
});
