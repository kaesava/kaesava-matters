ALTER TABLE "file_notes" ADD COLUMN IF NOT EXISTS "is_auto_generated" boolean NOT NULL DEFAULT false;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_number" varchar(40) NOT NULL,
  "title" varchar(255) NOT NULL,
  "description" text,
  "status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "site_id" uuid REFERENCES "tm_sites"("id"),
  "job_id" uuid REFERENCES "tm_jobs"("id"),
  "version" integer DEFAULT 1 NOT NULL,
  "valid_until" timestamptz,
  "gst_mode" varchar(24) DEFAULT 'EXCLUSIVE' NOT NULL,
  "subtotal_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "deposit_type" varchar(24) DEFAULT 'NONE' NOT NULL,
  "deposit_value" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "deposit_amount_due" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "portal_token_hash" varchar(128),
  "sent_at" timestamptz,
  "viewed_at" timestamptz,
  "accepted_at" timestamptz,
  "declined_at" timestamptz,
  "decline_reason" text,
  "signer_name" varchar(255),
  "signature_svg" text,
  "selected_option_group_id" uuid,
  "pdf_file_note_id" uuid REFERENCES "file_notes"("id"),
  "follow_up_sent_at" timestamptz,
  "notes" text,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_quote_option_groups" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_id" uuid NOT NULL REFERENCES "tm_quotes"("id"),
  "name" varchar(100) NOT NULL,
  "description" text,
  "is_recommended" boolean DEFAULT false NOT NULL,
  "is_selected" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "subtotal_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_quote_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "quote_id" uuid NOT NULL REFERENCES "tm_quotes"("id"),
  "option_group_id" uuid REFERENCES "tm_quote_option_groups"("id"),
  "pricebook_item_id" uuid REFERENCES "tm_pricebook_items"("id"),
  "description" varchar(500) NOT NULL,
  "quantity" numeric(10, 2) DEFAULT '1.00' NOT NULL,
  "unit_cost_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "unit_sell_price" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tax_code" varchar(24) DEFAULT 'GST' NOT NULL,
  "line_total_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "line_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "line_total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_comm_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "entity_type" varchar(40) NOT NULL,
  "entity_id" uuid NOT NULL,
  "channel" varchar(24) DEFAULT 'EMAIL' NOT NULL,
  "direction" varchar(16) DEFAULT 'OUTBOUND' NOT NULL,
  "recipient" varchar(255),
  "subject" varchar(255),
  "body_preview" text,
  "status" varchar(32) DEFAULT 'SENT' NOT NULL,
  "sent_at" timestamptz DEFAULT now() NOT NULL,
  "tenant_id" uuid NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "app_id" uuid NOT NULL REFERENCES "apps"("id"),
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "created_by" uuid REFERENCES "users"("id"),
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "updated_by" uuid REFERENCES "users"("id"),
  "archived_at" timestamptz,
  "archived_by" uuid REFERENCES "users"("id")
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tm_quotes_tenant_status_idx" ON "tm_quotes" ("tenant_id", "app_id", "status");
CREATE INDEX IF NOT EXISTS "tm_quotes_portal_hash_idx" ON "tm_quotes" ("portal_token_hash");
CREATE INDEX IF NOT EXISTS "tm_quote_option_groups_quote_idx" ON "tm_quote_option_groups" ("quote_id");
CREATE INDEX IF NOT EXISTS "tm_quote_lines_quote_idx" ON "tm_quote_lines" ("quote_id");
CREATE INDEX IF NOT EXISTS "tm_comm_logs_entity_idx" ON "tm_comm_logs" ("tenant_id", "entity_type", "entity_id");
--> statement-breakpoint
ALTER TABLE "tm_quotes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_quotes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_quotes_tenant_isolation" ON "tm_quotes";
CREATE POLICY "tm_quotes_tenant_isolation" ON "tm_quotes"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_quote_option_groups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_quote_option_groups" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_quote_option_groups_tenant_isolation" ON "tm_quote_option_groups";
CREATE POLICY "tm_quote_option_groups_tenant_isolation" ON "tm_quote_option_groups"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_quote_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_quote_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_quote_lines_tenant_isolation" ON "tm_quote_lines";
CREATE POLICY "tm_quote_lines_tenant_isolation" ON "tm_quote_lines"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_comm_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_comm_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_comm_logs_tenant_isolation" ON "tm_comm_logs";
CREATE POLICY "tm_comm_logs_tenant_isolation" ON "tm_comm_logs"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
