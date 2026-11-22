import { pgTable, uuid, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { users } from "./user.js";
import { apps } from "./app.js";

/**
 * Per-app trial consumption ledger (scoped by userId + appId).
 * Prevents cross-app trial exhaustion while surviving workspace deletion.
 */
export const userAppTrials = pgTable(
  "user_app_trials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id, { onDelete: "cascade" }),
    firstTrialStartedAt: timestamp("first_trial_started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: uuid("updated_by"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedBy: uuid("archived_by"),
  },
  (table) => [
    uniqueIndex("user_app_trials_user_app_idx").on(table.userId, table.appId),
  ]
);
