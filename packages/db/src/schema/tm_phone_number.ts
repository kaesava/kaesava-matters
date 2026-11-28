import { pgTable, uuid, varchar, boolean, text } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * Dedicated Twilio AU phone number provisioned for a Tradie Matters tenant.
 */
export const tmPhoneNumbers = pgTable("tm_phone_numbers", {
  id: uuid("id").defaultRandom().primaryKey(),
  e164Number: varchar("e164_number", { length: 32 }).notNull(),
  twilioPhoneSid: varchar("twilio_phone_sid", { length: 64 }).notNull(),
  missedCallAutoTextEnabled: boolean("missed_call_auto_text_enabled").notNull().default(true),
  missedCallTemplate: text("missed_call_template"),
  ...tenantAndTimestamps,
});
