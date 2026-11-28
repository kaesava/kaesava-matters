import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { tenantAndTimestamps } from "./base.js";

/**
 * OAuth2 accounting provider connection (Xero, MYOB, QuickBooks Online) per tenant.
 */
export const tmAccountingConnections = pgTable("tm_accounting_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  provider: varchar("provider", { length: 24 }).notNull(),
  externalTenantId: varchar("external_tenant_id", { length: 255 }).notNull(),
  externalTenantName: varchar("external_tenant_name", { length: 255 }),
  accessTokenEnc: text("access_token_enc").notNull(),
  refreshTokenEnc: text("refresh_token_enc"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  syncCursor: varchar("sync_cursor", { length: 255 }),
  oauthState: varchar("oauth_state", { length: 128 }),
  oauthVerifier: text("oauth_verifier"),
  ...tenantAndTimestamps,
});
