-- 0076_tm_v1_v2_launch_completeness.sql
-- Adds V1/V2 launch-completeness columns for PayID, PayTo, markup, 12% super,
-- variation signatures/evidence, timesheet approval status, portal token sealing,
-- review deduplication, and OAuth2 PKCE state.

ALTER TABLE "tm_business_profiles"
  ADD COLUMN IF NOT EXISTS "default_gst_mode" varchar(16) NOT NULL DEFAULT 'EXCLUSIVE',
  ADD COLUMN IF NOT EXISTS "default_call_out_fee" numeric(10, 2),
  ADD COLUMN IF NOT EXISTS "default_markup_pct" numeric(5, 2) NOT NULL DEFAULT '20.00',
  ADD COLUMN IF NOT EXISTS "default_super_rate_percent" numeric(5, 2) NOT NULL DEFAULT '12.00',
  ADD COLUMN IF NOT EXISTS "target_margin_pct" numeric(5, 2) NOT NULL DEFAULT '30.00',
  ADD COLUMN IF NOT EXISTS "pay_id_type" varchar(16),
  ADD COLUMN IF NOT EXISTS "pay_id_value" varchar(255),
  ADD COLUMN IF NOT EXISTS "logo_file_note_id" uuid REFERENCES "file_notes"("id"),
  ADD COLUMN IF NOT EXISTS "pay_to_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "quote_follow_up_days_json" jsonb NOT NULL DEFAULT '[2, 5, 10]'::jsonb,
  ADD COLUMN IF NOT EXISTS "google_review_url" text,
  ADD COLUMN IF NOT EXISTS "supplier_inbox_slug" varchar(80);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_business_profiles_supplier_slug_idx"
  ON "tm_business_profiles" ("supplier_inbox_slug")
  WHERE "supplier_inbox_slug" IS NOT NULL AND "archived_at" IS NULL;

ALTER TABLE "tm_variations"
  ADD COLUMN IF NOT EXISTS "signature_svg" text,
  ADD COLUMN IF NOT EXISTS "approval_method" varchar(24),
  ADD COLUMN IF NOT EXISTS "evidence_file_note_id" uuid REFERENCES "file_notes"("id");

ALTER TABLE "tm_time_entries"
  ADD COLUMN IF NOT EXISTS "break_minutes" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "approval_status" varchar(24) NOT NULL DEFAULT 'SUBMITTED',
  ADD COLUMN IF NOT EXISTS "approved_by" uuid REFERENCES "users"("id"),
  ADD COLUMN IF NOT EXISTS "approved_at" timestamptz;

ALTER TABLE "tm_quotes"
  ADD COLUMN IF NOT EXISTS "portal_token_enc" text,
  ADD COLUMN IF NOT EXISTS "follow_up_enabled" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "follow_up_stage" integer NOT NULL DEFAULT 0;

ALTER TABLE "tm_invoices"
  ADD COLUMN IF NOT EXISTS "portal_token_enc" text;

ALTER TABLE "tm_review_requests"
  ADD COLUMN IF NOT EXISTS "public_token_hash" varchar(128);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_review_requests_unique_invoice_idx"
  ON "tm_review_requests" ("tenant_id", "app_id", "invoice_id")
  WHERE "invoice_id" IS NOT NULL AND "archived_at" IS NULL;

ALTER TABLE "tm_accounting_connections"
  ADD COLUMN IF NOT EXISTS "oauth_state" varchar(128),
  ADD COLUMN IF NOT EXISTS "oauth_verifier" text;

ALTER TABLE "tm_jobs"
  ADD COLUMN IF NOT EXISTS "target_margin_pct" numeric(5, 2);
