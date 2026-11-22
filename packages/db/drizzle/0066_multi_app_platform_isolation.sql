-- Migration 0066: Multi-App Platform Isolation Hardening
-- 1. Add VIEWER to member_role_enum
ALTER TYPE "public"."member_role_enum" ADD VALUE IF NOT EXISTS 'VIEWER';

-- 2. Create per-app trial ledger (user_app_trials) and backfill from users.has_used_trial
CREATE TABLE IF NOT EXISTS "user_app_trials" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id") ON DELETE CASCADE,
  "first_trial_started_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_app_trials_user_app_idx"
  ON "user_app_trials" ("user_id", "app_id");

-- Backfill existing trial users per app from their owned/member tenants
INSERT INTO "user_app_trials" ("user_id", "app_id", "first_trial_started_at", "created_by", "updated_by")
SELECT DISTINCT u."id", t."app_id", COALESCE(t."trial_started_at", u."created_at", now()), u."id", u."id"
FROM "users" u
INNER JOIN "tenant_users" tu ON tu."user_id" = u."id"
INNER JOIN "tenants" t ON t."id" = tu."tenant_id"
WHERE u."has_used_trial" = true
ON CONFLICT ("user_id", "app_id") DO NOTHING;

-- Enable FORCE RLS and mm_app grants on user_app_trials
ALTER TABLE "user_app_trials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_app_trials" FORCE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON "user_app_trials" TO mm_app;

DROP POLICY IF EXISTS user_app_trials_isolation ON "user_app_trials";
CREATE POLICY user_app_trials_isolation ON "user_app_trials"
  FOR ALL
  USING (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR "user_id" = current_setting('app.current_user_id', true)::uuid
  )
  WITH CHECK (
    current_setting('app.current_user_id', true) IS NULL
    OR current_setting('app.current_user_id', true) = ''
    OR "user_id" = current_setting('app.current_user_id', true)::uuid
  );

-- Drop global users.has_used_trial column (superseded by user_app_trials)
ALTER TABLE "users" DROP COLUMN IF EXISTS "has_used_trial";

-- 3. Remove hardcoded Money Matters UUID defaults on ai_usage & billing_invoices
ALTER TABLE "ai_usage" ALTER COLUMN "app_id" DROP DEFAULT;
DROP INDEX IF EXISTS "ai_usage_tenant_period_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "ai_usage_tenant_app_period_idx"
  ON "ai_usage" ("tenant_id", "app_id", "period_month");

ALTER TABLE "billing_invoices" ALTER COLUMN "app_id" DROP DEFAULT;
ALTER TABLE "billing_invoices" ALTER COLUMN "currency" DROP DEFAULT;

-- 4. Neutralize hardcoded AU/AUD/Australia/Sydney/+61 defaults on platform tables
ALTER TABLE "tenants" ALTER COLUMN "country" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "currency" DROP DEFAULT;
ALTER TABLE "tenants" ALTER COLUMN "timezone" SET DEFAULT 'UTC';
ALTER TABLE "user_preferences" ALTER COLUMN "phone_country_code" DROP DEFAULT;
ALTER TABLE "apps" ALTER COLUMN "feature_flags" SET DEFAULT '{}'::jsonb;
