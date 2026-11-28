-- Migration 0069: Tradie Matters business profile and team member profile tables with RLS
CREATE TABLE IF NOT EXISTS "tm_business_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "trade_type" varchar(100) DEFAULT 'GENERAL' NOT NULL,
  "abn" varchar(32),
  "gst_registered" boolean DEFAULT true NOT NULL,
  "default_tax_rate_percent" numeric(5, 2) DEFAULT '10.00' NOT NULL,
  "quote_prefix" varchar(20) DEFAULT 'Q-' NOT NULL,
  "next_quote_number" integer DEFAULT 1 NOT NULL,
  "invoice_prefix" varchar(20) DEFAULT 'INV-' NOT NULL,
  "next_invoice_number" integer DEFAULT 1 NOT NULL,
  "default_payment_terms_days" integer DEFAULT 14 NOT NULL,
  "default_hourly_charge_rate" numeric(10, 2),
  "bank_account_name" varchar(255),
  "bank_bsb" varchar(20),
  "bank_account_number" varchar(40),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_business_profiles_tenant_app_active_idx"
  ON "tm_business_profiles" ("tenant_id", "app_id")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_team_member_profiles" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "trade_license_number" varchar(100),
  "license_expiry_date" date,
  "internal_hourly_cost_rate" numeric(10, 2),
  "default_charge_out_rate" numeric(10, 2),
  "color_hex" varchar(16),
  "phone" varchar(40),
  "is_field_active" boolean DEFAULT true NOT NULL,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_team_member_profiles_tenant_user_active_idx"
  ON "tm_team_member_profiles" ("tenant_id", "app_id", "user_id")
  WHERE "archived_at" IS NULL;

ALTER TABLE "tm_business_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_business_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_business_profiles_tenant_isolation" ON "tm_business_profiles";
CREATE POLICY "tm_business_profiles_tenant_isolation" ON "tm_business_profiles"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_team_member_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_team_member_profiles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_team_member_profiles_tenant_isolation" ON "tm_team_member_profiles";
CREATE POLICY "tm_team_member_profiles_tenant_isolation" ON "tm_team_member_profiles"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
