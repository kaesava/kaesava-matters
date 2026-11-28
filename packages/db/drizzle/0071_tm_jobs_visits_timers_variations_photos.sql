-- Migration 0071: Tradie Matters jobs, visits, assignees, time entries, variations, materials, attachments with RLS
CREATE TABLE IF NOT EXISTS "tm_jobs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_number" varchar(40) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(32) DEFAULT 'LEAD' NOT NULL,
  "priority" varchar(24) DEFAULT 'NORMAL' NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "site_id" uuid REFERENCES "tm_sites"("id"),
  "lead_tradie_user_id" uuid REFERENCES "users"("id"),
  "scheduled_start" timestamp with time zone,
  "scheduled_end" timestamp with time zone,
  "completed_at" timestamp with time zone,
  "estimated_hours" numeric(8, 2),
  "quoted_amount_ex_tax" numeric(12, 2),
  "has_unbilled_extras" boolean DEFAULT false NOT NULL,
  "purchase_order_number" varchar(80),
  "internal_notes" text,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_jobs_tenant_app_number_active_idx"
  ON "tm_jobs" ("tenant_id", "app_id", "job_number")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_job_visits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "tm_jobs"("id"),
  "title" varchar(255) NOT NULL,
  "status" varchar(32) DEFAULT 'SCHEDULED' NOT NULL,
  "scheduled_start" timestamp with time zone NOT NULL,
  "scheduled_end" timestamp with time zone NOT NULL,
  "actual_check_in_at" timestamp with time zone,
  "actual_check_out_at" timestamp with time zone,
  "check_in_lat" numeric(10, 7),
  "check_in_lng" numeric(10, 7),
  "check_out_lat" numeric(10, 7),
  "check_out_lng" numeric(10, 7),
  "visit_notes" text,
  "client_mutation_id" varchar(120),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_job_visits_client_mutation_idx"
  ON "tm_job_visits" ("tenant_id", "client_mutation_id")
  WHERE "client_mutation_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "tm_job_visit_assignees" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "visit_id" uuid NOT NULL REFERENCES "tm_job_visits"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "is_lead" boolean DEFAULT false NOT NULL,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_job_visit_assignees_unique_active_idx"
  ON "tm_job_visit_assignees" ("tenant_id", "visit_id", "user_id")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_time_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "tm_jobs"("id"),
  "visit_id" uuid REFERENCES "tm_job_visits"("id"),
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "started_at" timestamp with time zone NOT NULL,
  "ended_at" timestamp with time zone,
  "duration_minutes" integer DEFAULT 0 NOT NULL,
  "is_billable" boolean DEFAULT true NOT NULL,
  "hourly_cost_snapshot" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "hourly_charge_snapshot" numeric(10, 2) DEFAULT '0.00' NOT NULL,
  "invoiced_in_invoice_id" uuid,
  "notes" text,
  "client_mutation_id" varchar(120),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_time_entries_client_mutation_idx"
  ON "tm_time_entries" ("tenant_id", "client_mutation_id")
  WHERE "client_mutation_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "tm_variations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "tm_jobs"("id"),
  "variation_number" varchar(40) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
  "total_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "approved_at" timestamp with time zone,
  "approved_by_name" varchar(255),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE TABLE IF NOT EXISTS "tm_variation_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "variation_id" uuid NOT NULL REFERENCES "tm_variations"("id"),
  "pricebook_item_id" uuid REFERENCES "tm_pricebook_items"("id"),
  "description" varchar(500) NOT NULL,
  "quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
  "unit_cost_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "unit_sell_price_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tax_code" varchar(32) DEFAULT 'GST' NOT NULL,
  "line_total_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE TABLE IF NOT EXISTS "tm_material_usages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "tm_jobs"("id"),
  "visit_id" uuid REFERENCES "tm_job_visits"("id"),
  "pricebook_item_id" uuid REFERENCES "tm_pricebook_items"("id"),
  "description" varchar(500) NOT NULL,
  "quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
  "unit_cost_snapshot" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "unit_sell_price_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tax_code" varchar(32) DEFAULT 'GST' NOT NULL,
  "is_billable" boolean DEFAULT true NOT NULL,
  "invoiced_in_invoice_id" uuid,
  "client_mutation_id" varchar(120),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_material_usages_client_mutation_idx"
  ON "tm_material_usages" ("tenant_id", "client_mutation_id")
  WHERE "client_mutation_id" IS NOT NULL;

CREATE TABLE IF NOT EXISTS "tm_job_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid NOT NULL REFERENCES "tm_jobs"("id"),
  "visit_id" uuid REFERENCES "tm_job_visits"("id"),
  "file_note_id" uuid NOT NULL REFERENCES "file_notes"("id"),
  "photo_category" varchar(32) DEFAULT 'PROGRESS' NOT NULL,
  "visibility" varchar(32) DEFAULT 'INTERNAL' NOT NULL,
  "caption" varchar(500),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

ALTER TABLE "tm_jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_jobs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_jobs_tenant_isolation" ON "tm_jobs";
CREATE POLICY "tm_jobs_tenant_isolation" ON "tm_jobs"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_job_visits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_job_visits" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_job_visits_tenant_isolation" ON "tm_job_visits";
CREATE POLICY "tm_job_visits_tenant_isolation" ON "tm_job_visits"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_job_visit_assignees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_job_visit_assignees" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_job_visit_assignees_tenant_isolation" ON "tm_job_visit_assignees";
CREATE POLICY "tm_job_visit_assignees_tenant_isolation" ON "tm_job_visit_assignees"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_time_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_time_entries" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_time_entries_tenant_isolation" ON "tm_time_entries";
CREATE POLICY "tm_time_entries_tenant_isolation" ON "tm_time_entries"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_variations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_variations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_variations_tenant_isolation" ON "tm_variations";
CREATE POLICY "tm_variations_tenant_isolation" ON "tm_variations"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_variation_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_variation_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_variation_lines_tenant_isolation" ON "tm_variation_lines";
CREATE POLICY "tm_variation_lines_tenant_isolation" ON "tm_variation_lines"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_material_usages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_material_usages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_material_usages_tenant_isolation" ON "tm_material_usages";
CREATE POLICY "tm_material_usages_tenant_isolation" ON "tm_material_usages"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_job_attachments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_job_attachments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_job_attachments_tenant_isolation" ON "tm_job_attachments";
CREATE POLICY "tm_job_attachments_tenant_isolation" ON "tm_job_attachments"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
