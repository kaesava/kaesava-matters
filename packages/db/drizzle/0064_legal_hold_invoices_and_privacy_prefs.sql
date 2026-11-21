-- Migration 0064: Legal-hold billing invoices, Terms audit columns on users, and notification amount masking
-- 1. Terms acceptance audit columns on users
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "terms_accepted_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "terms_version" text,
  ADD COLUMN IF NOT EXISTS "privacy_version" text;

-- 2. Privacy-by-design notification amount masking preference
ALTER TABLE "user_preferences"
  ADD COLUMN IF NOT EXISTS "hide_amounts_in_notifications" boolean NOT NULL DEFAULT false;

-- 3. Statutory 5-year legal-hold retention for billing_invoices on household deletion
ALTER TABLE "billing_invoices"
  ALTER COLUMN "tenant_id" DROP NOT NULL;

ALTER TABLE "billing_invoices"
  DROP CONSTRAINT IF EXISTS "billing_invoices_tenant_id_tenants_id_fk";

ALTER TABLE "billing_invoices"
  ADD CONSTRAINT "billing_invoices_tenant_id_tenants_id_fk"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL;

ALTER TABLE "billing_invoices"
  ADD COLUMN IF NOT EXISTS "legal_hold_until" timestamp with time zone;

DROP POLICY IF EXISTS "billing_invoices_tenant_isolation" ON "billing_invoices";
CREATE POLICY "billing_invoices_tenant_isolation" ON "billing_invoices"
  FOR ALL
  USING (
    tenant_id IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    tenant_id IS NOT NULL
    AND tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
