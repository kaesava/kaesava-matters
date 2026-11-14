-- Migration 0060: Drop dead, write-only, and duplicate schema columns across 6 tables

-- 1. envelopes: drop dead visual columns (replaced by Lucide icon)
ALTER TABLE "envelopes"
  DROP COLUMN IF EXISTS "emoji",
  DROP COLUMN IF EXISTS "color_key";

-- 2. user_preferences: drop unused theme column
ALTER TABLE "user_preferences"
  DROP COLUMN IF EXISTS "theme";

-- 3. tenant_users: drop redundant app_id (derived via tenants.app_id) and unused invited_at
ALTER TABLE "tenant_users"
  DROP COLUMN IF EXISTS "app_id",
  DROP COLUMN IF EXISTS "invited_at";

-- 4. transfer_events: drop write-only actual_amount
ALTER TABLE "transfer_events"
  DROP COLUMN IF EXISTS "actual_amount";

-- 5. early_access_subscribers: drop write-only last_subscribed_at
ALTER TABLE "early_access_subscribers"
  DROP COLUMN IF EXISTS "last_subscribed_at";

-- 6. processed_webhooks: drop unused event_type metadata
ALTER TABLE "processed_webhooks"
  DROP COLUMN IF EXISTS "event_type";
