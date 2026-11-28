ALTER TABLE "tm_business_profiles" ADD COLUMN IF NOT EXISTS "stripe_account_id" varchar(255);
ALTER TABLE "tm_business_profiles" ADD COLUMN IF NOT EXISTS "stripe_charges_enabled" boolean NOT NULL DEFAULT false;
ALTER TABLE "tm_business_profiles" ADD COLUMN IF NOT EXISTS "default_max_card_amount" numeric(12, 2);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tm_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_number" varchar(40) NOT NULL,
  "invoice_type" varchar(24) DEFAULT 'FINAL' NOT NULL,
  "status" varchar(32) DEFAULT 'DRAFT' NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "site_id" uuid REFERENCES "tm_sites"("id"),
  "job_id" uuid REFERENCES "tm_jobs"("id"),
  "quote_id" uuid REFERENCES "tm_quotes"("id"),
  "issue_date" date NOT NULL,
  "due_date" date NOT NULL,
  "gst_registered_snapshot" boolean DEFAULT true NOT NULL,
  "document_title" varchar(40) DEFAULT 'Tax Invoice' NOT NULL,
  "subtotal_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "amount_paid" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "credit_applied" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "balance_due" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "locked_at" timestamptz,
  "legal_hold_until" timestamptz,
  "allow_card_payment" boolean DEFAULT true NOT NULL,
  "max_card_amount_override" numeric(12, 2),
  "portal_token_hash" varchar(128),
  "chasing_enabled" boolean DEFAULT true NOT NULL,
  "chasing_schedule_days_json" jsonb DEFAULT '[-3, 3, 14]'::jsonb NOT NULL,
  "last_chased_stage" integer,
  "disputed_reason" text,
  "pdf_file_note_id" uuid REFERENCES "file_notes"("id"),
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
CREATE TABLE IF NOT EXISTS "tm_invoice_lines" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "tm_invoices"("id"),
  "source_type" varchar(32) DEFAULT 'MANUAL' NOT NULL,
  "source_id" uuid,
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
CREATE TABLE IF NOT EXISTS "tm_invoice_payments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "tm_invoices"("id"),
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "amount" numeric(12, 2) NOT NULL,
  "payment_method" varchar(32) DEFAULT 'BANK_TRANSFER' NOT NULL,
  "payment_date" timestamptz DEFAULT now() NOT NULL,
  "reference" varchar(255),
  "stripe_payment_intent_id" varchar(255),
  "stripe_charge_id" varchar(255),
  "refunded_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
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
CREATE TABLE IF NOT EXISTS "tm_credit_notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "credit_note_number" varchar(40) NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "tm_invoices"("id"),
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "reason" text NOT NULL,
  "amount_ex_tax" numeric(12, 2) NOT NULL,
  "tax_amount" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "total_inc_tax" numeric(12, 2) NOT NULL,
  "credit_destination" varchar(32) DEFAULT 'INVOICE_BALANCE' NOT NULL,
  "issued_at" timestamptz DEFAULT now() NOT NULL,
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
CREATE TABLE IF NOT EXISTS "tm_invoice_refunds" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "invoice_id" uuid NOT NULL REFERENCES "tm_invoices"("id"),
  "payment_id" uuid NOT NULL REFERENCES "tm_invoice_payments"("id"),
  "amount" numeric(12, 2) NOT NULL,
  "refund_method" varchar(32) DEFAULT 'MANUAL' NOT NULL,
  "reason" text,
  "stripe_refund_id" varchar(255),
  "refunded_at" timestamptz DEFAULT now() NOT NULL,
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
CREATE INDEX IF NOT EXISTS "tm_invoices_tenant_status_idx" ON "tm_invoices" ("tenant_id", "app_id", "status");
CREATE INDEX IF NOT EXISTS "tm_invoices_portal_hash_idx" ON "tm_invoices" ("portal_token_hash");
CREATE INDEX IF NOT EXISTS "tm_invoices_job_idx" ON "tm_invoices" ("job_id");
CREATE INDEX IF NOT EXISTS "tm_invoice_lines_invoice_idx" ON "tm_invoice_lines" ("invoice_id");
CREATE INDEX IF NOT EXISTS "tm_invoice_payments_invoice_idx" ON "tm_invoice_payments" ("invoice_id");
CREATE INDEX IF NOT EXISTS "tm_credit_notes_invoice_idx" ON "tm_credit_notes" ("invoice_id");
CREATE INDEX IF NOT EXISTS "tm_invoice_refunds_invoice_idx" ON "tm_invoice_refunds" ("invoice_id");
--> statement-breakpoint
ALTER TABLE "tm_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_invoices" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_invoices_tenant_isolation" ON "tm_invoices";
CREATE POLICY "tm_invoices_tenant_isolation" ON "tm_invoices"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_invoice_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_invoice_lines" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_invoice_lines_tenant_isolation" ON "tm_invoice_lines";
CREATE POLICY "tm_invoice_lines_tenant_isolation" ON "tm_invoice_lines"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_invoice_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_invoice_payments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_invoice_payments_tenant_isolation" ON "tm_invoice_payments";
CREATE POLICY "tm_invoice_payments_tenant_isolation" ON "tm_invoice_payments"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_credit_notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_credit_notes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_credit_notes_tenant_isolation" ON "tm_credit_notes";
CREATE POLICY "tm_credit_notes_tenant_isolation" ON "tm_credit_notes"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_invoice_refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_invoice_refunds" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_invoice_refunds_tenant_isolation" ON "tm_invoice_refunds";
CREATE POLICY "tm_invoice_refunds_tenant_isolation" ON "tm_invoice_refunds"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
