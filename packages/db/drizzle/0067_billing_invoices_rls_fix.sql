-- Migration 0067: Ensure billing_invoices RLS policy supports multi-app webhook ingestion
-- Webhooks set SET LOCAL app.current_tenant_id = '<tenantId>' before upserting invoices.
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
