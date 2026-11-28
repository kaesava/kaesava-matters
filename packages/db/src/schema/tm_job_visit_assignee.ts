import { pgTable, uuid, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmJobVisits } from "./tm_job_visit.js";
import { users } from "./user.js";

/**
 * Crew member assignment to a Tradie Matters job visit.
 */
export const tmJobVisitAssignees = pgTable("tm_job_visit_assignees", {
  id: uuid("id").defaultRandom().primaryKey(),
  visitId: uuid("visit_id")
    .notNull()
    .references(() => tmJobVisits.id),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  isLead: boolean("is_lead").notNull().default(false),
  ...tenantAndTimestamps,
});
