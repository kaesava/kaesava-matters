CREATE TABLE IF NOT EXISTS "tm_accounting_connections" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(24) NOT NULL,
  "external_tenant_id" varchar(255) NOT NULL,
  "external_tenant_name" varchar(255),
  "access_token_enc" text NOT NULL,
  "refresh_token_enc" text,
  "token_expires_at" timestamptz,
  "last_synced_at" timestamptz,
  "sync_cursor" varchar(255),
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
CREATE TABLE IF NOT EXISTS "tm_accounting_entity_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" varchar(24) NOT NULL,
  "entity_type" varchar(40) NOT NULL,
  "local_id" uuid NOT NULL,
  "external_id" varchar(255) NOT NULL,
  "sync_status" varchar(24) DEFAULT 'SYNCED' NOT NULL,
  "last_sync_hash" varchar(128),
  "last_error" text,
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
CREATE TABLE IF NOT EXISTS "tm_supplier_bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "job_id" uuid REFERENCES "tm_jobs"("id"),
  "supplier_name" varchar(255) NOT NULL,
  "supplier_abn" varchar(32),
  "bill_number" varchar(80),
  "issue_date" date NOT NULL,
  "due_date" date,
  "subtotal_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "receipt_file_note_id" uuid REFERENCES "file_notes"("id"),
  "source" varchar(24) DEFAULT 'MANUAL' NOT NULL,
  "status" varchar(24) DEFAULT 'DRAFT' NOT NULL,
  "applied_markup_pct" numeric(6, 2) DEFAULT '0.00' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "tm_purchase_orders" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "po_number" varchar(40) NOT NULL,
  "job_id" uuid REFERENCES "tm_jobs"("id"),
  "supplier_name" varchar(255) NOT NULL,
  "supplier_email" varchar(255),
  "status" varchar(24) DEFAULT 'DRAFT' NOT NULL,
  "lines_json" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "notes" text,
  "sent_at" timestamptz,
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
CREATE INDEX IF NOT EXISTS "tm_accounting_connections_tenant_provider_idx" ON "tm_accounting_connections" ("tenant_id", "app_id", "provider");
CREATE INDEX IF NOT EXISTS "tm_accounting_entity_links_lookup_idx" ON "tm_accounting_entity_links" ("tenant_id", "app_id", "provider", "entity_type", "local_id");
CREATE INDEX IF NOT EXISTS "tm_supplier_bills_job_idx" ON "tm_supplier_bills" ("job_id");
CREATE INDEX IF NOT EXISTS "tm_purchase_orders_job_idx" ON "tm_purchase_orders" ("job_id");
--> statement-breakpoint
ALTER TABLE "tm_accounting_connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_accounting_connections" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_accounting_connections_tenant_isolation" ON "tm_accounting_connections";
CREATE POLICY "tm_accounting_connections_tenant_isolation" ON "tm_accounting_connections"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_accounting_entity_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_accounting_entity_links" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_accounting_entity_links_tenant_isolation" ON "tm_accounting_entity_links";
CREATE POLICY "tm_accounting_entity_links_tenant_isolation" ON "tm_accounting_entity_links"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_supplier_bills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_supplier_bills" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_supplier_bills_tenant_isolation" ON "tm_supplier_bills";
CREATE POLICY "tm_supplier_bills_tenant_isolation" ON "tm_supplier_bills"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_purchase_orders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_purchase_orders_tenant_isolation" ON "tm_purchase_orders";
CREATE POLICY "tm_purchase_orders_tenant_isolation" ON "tm_purchase_orders"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
