import { pgTable, uuid, varchar, boolean } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";
import { tmCustomers } from "./tm_customer.js";
import { tmSites } from "./tm_site.js";

/**
 * Many-to-many link between customers and job sites (owner, tenant, property manager, billing contact).
 */
export const tmCustomerSites = pgTable("tm_customer_sites", {
  id: uuid("id").defaultRandom().primaryKey(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => tmCustomers.id),
  siteId: uuid("site_id")
    .notNull()
    .references(() => tmSites.id),
  relationshipRole: varchar("relationship_role", { length: 40 }).notNull().default("OWNER"),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...tenantAndTimestamps,
});
