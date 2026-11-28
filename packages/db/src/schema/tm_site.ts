import { pgTable, uuid, varchar, text, numeric } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Tradie Matters physical job site with geocoded coordinates and access instructions.
 */
export const tmSites = pgTable("tm_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  addressLine1: varchar("address_line_1", { length: 255 }).notNull(),
  addressLine2: varchar("address_line_2", { length: 255 }),
  suburb: varchar("suburb", { length: 120 }),
  state: varchar("state", { length: 64 }),
  postcode: varchar("postcode", { length: 20 }),
  country: varchar("country", { length: 80 }).notNull().default("AU"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  accessNotes: text("access_notes"),
  keySafeCode: varchar("key_safe_code", { length: 64 }),
  siteContactName: varchar("site_contact_name", { length: 255 }),
  siteContactPhone: varchar("site_contact_phone", { length: 40 }),
  ...tenantAndTimestamps,
});
