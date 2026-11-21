import { uuid, text, timestamp } from "drizzle-orm/pg-core";
import { tenants } from "./tenant.js";
import { apps } from "./app.js";

/**
 * Standard multi-tenant audit & soft-delete columns required on every domain table.
 * New apps can spread `...tenantAuditColumns()` into any pgTable definition.
 */
export function tenantAuditColumns() {
  return {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    appId: uuid("app_id")
      .notNull()
      .references(() => apps.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    createdBy: text("created_by"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    updatedBy: text("updated_by"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
  };
}
