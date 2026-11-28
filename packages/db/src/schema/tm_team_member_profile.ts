import { pgTable, uuid, varchar, date, numeric, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { users } from "./user.js";

/**
 * Tradie Matters per-member operational profile (trade license, cost/charge rates, field status).
 */
export const tmTeamMemberProfiles = pgTable("tm_team_member_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  tradeLicenseNumber: varchar("trade_license_number", { length: 100 }),
  licenseExpiryDate: date("license_expiry_date"),
  internalHourlyCostRate: numeric("internal_hourly_cost_rate", { precision: 10, scale: 2 }),
  defaultChargeOutRate: numeric("default_charge_out_rate", { precision: 10, scale: 2 }),
  colorHex: varchar("color_hex", { length: 16 }),
  phone: varchar("phone", { length: 40 }),
  isFieldActive: boolean("is_field_active").notNull().default(true),
  ...tenantAndTimestamps,
});
