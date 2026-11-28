import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Mapping between local Tradie Matters entities and external accounting provider IDs.
 */
export const tmAccountingEntityLinks = pgTable("tm_accounting_entity_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 24 }).notNull(),
  entityType: varchar("entity_type", { length: 40 }).notNull(),
  localId: uuid("local_id").notNull(),
  externalId: varchar("external_id", { length: 255 }).notNull(),
  syncStatus: varchar("sync_status", { length: 24 }).notNull().default("SYNCED"),
  lastSyncHash: varchar("last_sync_hash", { length: 128 }),
  lastError: text("last_error"),
  ...tenantAndTimestamps,
});
