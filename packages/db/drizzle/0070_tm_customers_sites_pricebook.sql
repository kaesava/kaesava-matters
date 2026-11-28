-- Migration 0070: Tradie Matters customers, sites, customer_sites, and pricebook_items with RLS
CREATE TABLE IF NOT EXISTS "tm_customers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "company_name" varchar(255),
  "customer_type" varchar(32) DEFAULT 'RESIDENTIAL' NOT NULL,
  "email" varchar(255),
  "phone" varchar(40),
  "mobile" varchar(40),
  "abn" varchar(32),
  "billing_address" text,
  "payment_terms_days" integer,
  "credit_balance" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "notes" text,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE INDEX IF NOT EXISTS "tm_customers_tenant_app_idx"
  ON "tm_customers" ("tenant_id", "app_id")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" varchar(255) NOT NULL,
  "address_line_1" varchar(255) NOT NULL,
  "address_line_2" varchar(255),
  "suburb" varchar(120),
  "state" varchar(64),
  "postcode" varchar(20),
  "country" varchar(80) DEFAULT 'AU' NOT NULL,
  "latitude" numeric(10, 7),
  "longitude" numeric(10, 7),
  "access_notes" text,
  "key_safe_code" varchar(64),
  "site_contact_name" varchar(255),
  "site_contact_phone" varchar(40),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE INDEX IF NOT EXISTS "tm_sites_tenant_app_idx"
  ON "tm_sites" ("tenant_id", "app_id")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_customer_sites" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "customer_id" uuid NOT NULL REFERENCES "tm_customers"("id"),
  "site_id" uuid NOT NULL REFERENCES "tm_sites"("id"),
  "relationship_role" varchar(40) DEFAULT 'OWNER' NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS "tm_customer_sites_unique_active_idx"
  ON "tm_customer_sites" ("tenant_id", "app_id", "customer_id", "site_id")
  WHERE "archived_at" IS NULL;

CREATE TABLE IF NOT EXISTS "tm_pricebook_items" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "sku" varchar(80),
  "name" varchar(255) NOT NULL,
  "description" text,
  "item_type" varchar(32) DEFAULT 'MATERIAL' NOT NULL,
  "category" varchar(100),
  "unit_of_measure" varchar(32) DEFAULT 'EACH' NOT NULL,
  "search_aliases" text,
  "unit_cost_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "markup_pct" numeric(7, 2) DEFAULT '0.00' NOT NULL,
  "sell_price_ex_tax" numeric(12, 2) DEFAULT '0.00' NOT NULL,
  "tax_code" varchar(32) DEFAULT 'GST' NOT NULL,
  "is_favourite" boolean DEFAULT false NOT NULL,
  "supplier_name" varchar(255),
  "tenant_id" uuid NOT NULL,
  "app_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by" uuid NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" uuid NOT NULL,
  "archived_at" timestamp with time zone,
  "archived_by" uuid
);

CREATE INDEX IF NOT EXISTS "tm_pricebook_items_tenant_app_idx"
  ON "tm_pricebook_items" ("tenant_id", "app_id")
  WHERE "archived_at" IS NULL;

ALTER TABLE "tm_customers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_customers" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_customers_tenant_isolation" ON "tm_customers";
CREATE POLICY "tm_customers_tenant_isolation" ON "tm_customers"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_sites" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_sites_tenant_isolation" ON "tm_sites";
CREATE POLICY "tm_sites_tenant_isolation" ON "tm_sites"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_customer_sites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_customer_sites" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_customer_sites_tenant_isolation" ON "tm_customer_sites";
CREATE POLICY "tm_customer_sites_tenant_isolation" ON "tm_customer_sites"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);

ALTER TABLE "tm_pricebook_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tm_pricebook_items" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_pricebook_items_tenant_isolation" ON "tm_pricebook_items";
CREATE POLICY "tm_pricebook_items_tenant_isolation" ON "tm_pricebook_items"
  FOR ALL
  USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
